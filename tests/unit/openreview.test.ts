import { describe, expect, it, vi } from 'vitest'
import { discoverOpenReview } from '../../workers/openreview'

function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('OpenReview discovery', () => {
  it('keeps public due dates separate from technical expiry and rejects non-route groups', async () => {
    const due = Date.parse('2026-10-05T23:59:00Z')
    const expiry = due + 30 * 60_000
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.searchParams.get('id') === 'active_venues')
        return response({
          groups: [
            {
              members: [
                'ICML.cc/2026/Workshop/Useful_Route',
                'NeurIPS.cc/2026/Workshop_Proposals',
                'ICML.cc/2026/Workshop/Useful_Route/Reviewers',
                'Unreviewed.org/2026/Workshop/Other',
              ],
            },
          ],
        })
      if (url.pathname === '/groups')
        return response({
          groups: [
            {
              id: 'ICML.cc/2026/Workshop/Useful_Route',
              readers: ['everyone'],
              parent: 'ICML.cc/2026/Workshop',
              content: {
                title: { value: 'Useful Route workshop contribution' },
                website: { value: 'https://example.org/useful-route' },
                submission_id: { value: 'ICML.cc/2026/Workshop/Useful_Route/-/Submission' },
              },
            },
          ],
        })
      return response({
        invitations: [
          {
            id: 'ICML.cc/2026/Workshop/Useful_Route/-/Submission',
            readers: ['everyone'],
            duedate: due,
            expdate: expiry,
            cdate: due - 1000,
          },
        ],
      })
    }) as unknown as typeof fetch

    const found = await discoverOpenReview(fetcher)
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({
      duedate: '2026-10-05T23:59:00.000Z',
      expdate: '2026-10-06T00:29:00.000Z',
      highSchoolPolicy: 'not-stated',
    })
    expect(found[0]!.evidence.map((entry) => entry.semanticRole)).toEqual([
      'submission',
      'technical-expiry',
    ])
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('does not treat an active venue membership as an open submission', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.searchParams.get('id') === 'active_venues')
        return response({ groups: [{ members: ['IEEE.org/IROS/2026/Workshop/Touch-to-Action'] }] })
      if (url.pathname === '/groups')
        return response({
          groups: [
            {
              id: 'IEEE.org/IROS/2026/Workshop/Touch-to-Action',
              readers: ['everyone'],
              content: {
                title: { value: 'Touch-to-Action' },
                website: { value: 'https://example.org/touch' },
                submission_id: {
                  value: 'IEEE.org/IROS/2026/Workshop/Touch-to-Action/-/Submission',
                },
              },
            },
          ],
        })
      return response({
        invitations: [
          {
            id: 'IEEE.org/IROS/2026/Workshop/Touch-to-Action/-/Submission',
            readers: ['everyone'],
            duedate: Date.parse('2026-06-01T23:59:00Z'),
            expdate: Date.parse('2026-06-02T00:29:00Z'),
          },
        ],
      })
    }) as unknown as typeof fetch
    expect((await discoverOpenReview(fetcher))[0]!.active).toBe(false)
  })

  it('rotates the bounded discovery window and upgrades legacy organizer links to HTTPS', async () => {
    const due = Date.parse('2026-11-01T23:59:00Z')
    const venue = 'IEEE.org/IROS/2026/Workshop/Second'
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.searchParams.get('id') === 'active_venues')
        return response({
          groups: [
            {
              members: ['ICML.cc/2026/Workshop/First', venue, 'ICLR.cc/2026/Workshop/Third'],
            },
          ],
        })
      if (url.pathname === '/groups')
        return response({
          groups: [
            {
              id: venue,
              readers: ['everyone'],
              content: {
                title: { value: 'Second workshop route' },
                website: { value: 'http://example.org/second' },
                submission_id: { value: `${venue}/-/Submission` },
              },
            },
          ],
        })
      return response({
        invitations: [
          {
            id: `${venue}/-/Submission`,
            readers: ['everyone'],
            duedate: due,
          },
        ],
      })
    }) as unknown as typeof fetch

    const found = await discoverOpenReview(fetcher, 1, 1)
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ venueId: venue, website: 'https://example.org/second' })
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('withholds private venue groups and private invitations', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.searchParams.get('id') === 'active_venues')
        return response({ groups: [{ members: ['MICCAI.org/2026/Workshop/Private'] }] })
      return response({
        groups: [
          {
            id: 'MICCAI.org/2026/Workshop/Private',
            readers: ['MICCAI.org/2026/Workshop/Private'],
            content: {},
          },
        ],
      })
    }) as unknown as typeof fetch
    expect(await discoverOpenReview(fetcher)).toEqual([])
  })
})
