begin;
create or replace function public.outreach_classify_job_failure() returns trigger language plpgsql set search_path=public as $$
declare retry_time text;
begin
 new.failure_kind:=case when new.error is null then null when new.error ilike '%quota exhausted%' or new.error ilike '%budget exhausted%' then 'quota_wait' when new.error like '%(401)%' or new.error like '%(403)%' then 'provider_auth' when new.error like '%Source unavailable%' then 'source_access' else 'stage_failure' end;
 if new.failure_kind='quota_wait' and new.status='queued' then new.available_at:=greatest(new.available_at,now()+interval '15 minutes');end if;
 retry_time:=substring(new.error from 'retry_at=([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z)');
 if retry_time is not null and new.status='queued' then new.available_at:=greatest(new.available_at,least(retry_time::timestamptz,now()+interval '24 hours'));end if;
 return new;
end$$;
commit;
