import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

/** Test-only PostgREST subset. All supported mutations/RPCs execute real PostgreSQL;
 * unknown operators/routes fail closed rather than fabricating application results. */
export class PostgresSupabaseTransport {
  readonly db = new PGlite()
  readonly requests: { path: string; method: string }[] = []
  readonly errors: string[] = []
  readonly identities = new Map<string, { id: string; email: string }>()
  readonly providerRequests: string[] = []
  mailOutcome: 'accepted' | 'uncertain' = 'accepted'
  private readonly types = new Map<string, Map<string, string>>()
  private q(identifier: string) {
    if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) throw new Error('Unsupported SQL identifier')
    return '"' + identifier + '"'
  }
  async initialize() {
    await this.db
      .exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;grant execute on function auth.uid()to authenticated;
      create table public.opportunities(id text primary key,published boolean default true,suppressed boolean default false);
      create table public.join_responses(id bigint primary key,email text unique,name text,interests text[],goals text[],stage text,interest_other text,student_id text,parent_email text,note text);`)
    for (const name of [
      '023_outreach_workspace.sql',
      '024_outreach_mail.sql',
      '028_member_dashboard.sql',
      '20261008005351_dashboard_canonical_plan.sql',
      '20261008010345_dashboard_opportunity_decisions.sql',
      '20261009170000_research_profiles.sql',
      '20261009172000_officer_relationships.sql',
      '20261010015431_research_execution.sql',
      '20261010020426_research_evidence_approval_guard.sql',
      '20261010020659_research_matches_and_projection_guards.sql',
      '20261010021349_research_project_enrichment.sql',
      '20261010023000_research_preferences.sql',
      '20261010024500_relationship_alias_duplicate_guard.sql','20261010025500_selected_society_context.sql','20261010030000_officer_voice_preferences.sql',
    ])
      await this.db.exec(
        await readFile(new URL('../../supabase/migrations/' + name, import.meta.url), 'utf8'),
      )
  }
  async addIdentity(id: string, email: string, token: string, role = 'member') {
    await this.db.query('insert into auth.users(id,email,email_confirmed_at)values($1,$2,now())', [
      id,
      email,
    ])
    await this.db.query('select outreach_enroll_member($1,$2)', [id, email])
    if (role !== 'member')
      await this.db.query('update outreach_members set role=$1 where user_id=$2', [role, id])
    this.identities.set(token, { id, email })
  }
  private split(input: string) {
    let depth = 0,
      start = 0
    const parts: string[] = []
    for (let i = 0; i < input.length; i++) {
      if (input[i] === '(') depth++
      else if (input[i] === ')') depth--
      else if (input[i] === ',' && depth === 0) {
        parts.push(input.slice(start, i))
        start = i + 1
      }
    }
    parts.push(input.slice(start))
    return parts
  }
  private condition(column: string, filter: string, params: unknown[]): string {
    if (column === 'or' || column === 'and') {
      const parts = this.split(filter.replace(/^\(|\)$/g, ''))
      return (
        '(' +
        parts
          .map((part) => {
            const group = /^(and|or)\((.*)\)$/.exec(part)
            if (group) return this.condition(group[1]!, group[2]!, params)
            const dot = part.indexOf('.')
            return this.condition(part.slice(0, dot), part.slice(dot + 1), params)
          })
          .join(column === 'or' ? ' OR ' : ' AND ') +
        ')'
      )
    }
    const field = this.q(column)
    if (filter.startsWith('not.'))
      return 'NOT (' + this.condition(column, filter.slice(4), params) + ')'
    const dot = filter.indexOf('.'),
      op = filter.slice(0, dot),
      value = filter.slice(dot + 1)
    if (op === 'is') {
      if (value === 'null') return `${field} IS NULL`
      if (['true', 'false'].includes(value)) return `${field} IS ${value.toUpperCase()}`
      throw new Error('Unsupported is operand')
    }
    if (op === 'in') {
      const values = this.split(value.replace(/^\(|\)$/g, '')).map((v) => v.replace(/^"|"$/g, ''))
      return `${field} IN (${values
        .map((v) => {
          params.push(v)
          return '$' + params.length
        })
        .join(',')})`
    }
    const operators: Record<string, string> = {
      eq: '=',
      neq: '<>',
      lt: '<',
      lte: '<=',
      gt: '>',
      gte: '>=',
      like: 'LIKE',
      ilike: 'ILIKE',
    }
    if (!operators[op]) throw new Error('Unsupported PostgREST operator ' + op)
    params.push(value)
    return field + ' ' + operators[op] + ' $' + params.length
  }
  private async encode(table: string, column: string, value: unknown) {
    if (!this.types.has(table)) {
      const rows = (
        await this.db.query<{ column_name: string; udt_name: string }>(
          'select column_name,udt_name from information_schema.columns where table_schema=$1 and table_name=$2',
          ['public', table],
        )
      ).rows
      this.types.set(table, new Map(rows.map((r) => [r.column_name, r.udt_name])))
    }
    const type = this.types.get(table)!.get(column)
    if (!type) throw new Error('Unknown database column ' + table + '.' + column)
    if (value === null) return null
    if (type === 'jsonb' || type === 'json') return JSON.stringify(value)
    if (type.startsWith('_') && Array.isArray(value))
      return (
        '{' +
        value
          .map((v) => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"')
          .join(',') +
        '}'
      )
    return value
  }
  readonly fetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init),
      url = new URL(request.url)
    if (url.hostname === 'api.github.com') {
      this.providerRequests.push(url.href)
      if (url.pathname.endsWith('/readme'))
        return Response.json({
          encoding: 'base64',
          size: 90,
          path: 'README.md',
          sha: 'fixture-readme-v1',
          content: btoa(
            'Robot simulation with a reproducible evaluation harness. No member authorship is asserted.',
          ),
        })
      return Response.json({
        full_name: 'team/robot-evaluation',
        description: 'Robot simulation evaluation tools',
        default_branch: 'main',
        language: 'Python',
        updated_at: '2026-10-01T00:00:00Z',
      })
    }
    if (url.hostname === 'gmail.googleapis.com') {
      this.providerRequests.push(url.href)
      return this.mailOutcome === 'accepted'
        ? Response.json({ id: 'fixture-provider-message' })
        : Response.json({ error: 'fixture indeterminate submission' }, { status: 503 })
    }
    if (url.hostname !== 'persistence.supabase.test')
      throw new Error('Unconfigured external request ' + url.hostname)
    this.requests.push({ path: url.pathname, method: request.method })
    if (url.pathname === '/auth/v1/user') {
      const identity = this.identities.get(
        request.headers.get('authorization')?.replace(/^Bearer /, '') || '',
      )
      return identity
        ? Response.json({ ...identity, email_confirmed_at: '2026-10-01T00:00:00Z' })
        : Response.json({ message: 'Invalid fixture identity' }, { status: 401 })
    }
    if (request.headers.get('apikey') !== 'local-service-key')
      return Response.json({ message: 'Service transport required' }, { status: 403 })
    try {
      const path = url.pathname.replace(/^\/rest\/v1\//, '')
      if (path.startsWith('rpc/')) {
        const name = path.slice(4),
          body = (await request.json()) as Record<string, unknown>,
          params: unknown[] = []
        const args = Object.entries(body).map(([key, value]) => {
          params.push(value && typeof value === 'object' ? JSON.stringify(value) : value)
          return this.q(key) + ' => $' + params.length
        })
        const rows = (
          await this.db.query<{ value: unknown }>(
            'select to_jsonb(public.' + this.q(name) + '(' + args.join(',') + ')) value',
            params,
          )
        ).rows
        return Response.json(rows[0]?.value ?? null)
      }
      const table = path
      const name = 'public.' + this.q(table),
        params: unknown[] = []
      const skip = new Set(['select', 'order', 'limit', 'offset', 'on_conflict'])
      const filters = [...url.searchParams].filter(([key]) => !skip.has(key))
      const where = () =>
        filters.length
          ? ' WHERE ' +
            filters.map(([key, value]) => this.condition(key, value, params)).join(' AND ')
          : ''
      const selection = url.searchParams.get('select') || '*'
      const fields =
        selection === '*'
          ? '*'
          : selection
              .split(',')
              .map((field) => this.q(field))
              .join(',')
      let sql = ''
      if (request.method === 'GET' || request.method === 'HEAD') {
        sql = 'SELECT ' + fields + ' FROM ' + name + where()
        const order = url.searchParams.get('order')
        if (order)
          sql +=
            ' ORDER BY ' +
            order
              .split(',')
              .map((term) => {
                const [column, direction] = term.split('.')
                return this.q(column!) + (direction === 'desc' ? ' DESC' : ' ASC')
              })
              .join(',')
        const limit = url.searchParams.get('limit'),
          offset = url.searchParams.get('offset')
        if (limit) {
          params.push(Number(limit))
          sql += ' LIMIT $' + params.length
        }
        if (offset) {
          params.push(Number(offset))
          sql += ' OFFSET $' + params.length
        }
      } else if (request.method === 'PATCH') {
        const body = (await request.json()) as Record<string, unknown>
        const sequential: string[] = []
        for (const [key, value] of Object.entries(body)) {
          params.push(await this.encode(table, key, value))
          sequential.push(this.q(key) + '=$' + params.length)
        }
        sql = 'UPDATE ' + name + ' SET ' + sequential.join(',') + where() + ' RETURNING ' + fields
      } else if (request.method === 'POST') {
        const body = await request.json()
        const rows = Array.isArray(body) ? body : [body]
        const columns = Object.keys(rows[0])
        const values: string[] = []
        for (const row of rows) {
          const entries: string[] = []
          for (const column of columns) {
            params.push(await this.encode(table, column, row[column]))
            entries.push('$' + params.length)
          }
          values.push('(' + entries.join(',') + ')')
        }
        sql =
          'INSERT INTO ' +
          name +
          '(' +
          columns.map((c) => this.q(c)).join(',') +
          ')VALUES' +
          values.join(',')
        let conflict = url.searchParams.get('on_conflict')
        if (!conflict && request.headers.get('prefer')?.includes('resolution=merge-duplicates')) {
          const primary = (
            await this.db.query<{ column_name: string }>(
              `select k.column_name from information_schema.table_constraints t join information_schema.key_column_usage k using(constraint_name,table_schema,table_name) where t.table_schema='public' and t.table_name=$1 and t.constraint_type='PRIMARY KEY' order by k.ordinal_position`,
              [table],
            )
          ).rows
          conflict = primary.map((c) => c.column_name).join(',')
        }
        if (conflict && request.headers.get('prefer')?.includes('resolution=merge-duplicates'))
          sql +=
            ' ON CONFLICT(' +
            conflict
              .split(',')
              .map((c) => this.q(c))
              .join(',') +
            ')DO UPDATE SET ' +
            columns.map((c) => this.q(c) + '=excluded.' + this.q(c)).join(',')
        sql += ' RETURNING ' + fields
      } else throw new Error('Unsupported transport method')
      const rows = (await this.db.query(sql, params)).rows
      const dates = (
        await this.db.query<{ column_name: string }>(
          "select column_name from information_schema.columns where table_schema='public'and table_name=$1 and udt_name='date'",
          [table],
        )
      ).rows
      for (const row of rows)
        for (const { column_name } of dates)
          if (row[column_name] instanceof Date)
            row[column_name] = (row[column_name] as Date).toISOString().slice(0, 10)
      const singular = request.headers.get('accept')?.includes('vnd.pgrst.object+json')
      if (singular && rows.length !== 1)
        return Response.json(
          {
            code: 'PGRST116',
            message: 'JSON object requested, multiple (or no) rows returned',
            details: `The result contains ${rows.length} rows`,
          },
          { status: 406 },
        )
      return Response.json(singular ? rows[0] : rows, {
        headers: { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` },
      })
    } catch (error) {
      this.errors.push(error instanceof Error ? error.message : String(error))
      return Response.json(
        {
          code: 'LOCAL_DB_ERROR',
          message: error instanceof Error ? error.message : 'Database transport failed',
        },
        { status: 400 },
      )
    }
  }
}
