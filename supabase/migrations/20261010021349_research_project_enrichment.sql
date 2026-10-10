begin;
-- Source-backed project facts are candidates. A literal project method never establishes member expertise.
create function public.research_complete_enriched_artifact(p_user_id uuid,p_artifact_id uuid,p_token uuid,p_result jsonb)returns boolean language plpgsql set search_path='' as $$
declare a public.research_artifacts;s public.research_source_snapshots;fact jsonb;span_start integer;span_end integer;begin
 if not public.research_complete_artifact(p_user_id,p_artifact_id,p_token,p_result)then return false;end if;
 if p_result->>'state'<>'ready'then return true;end if;
 select * into a from public.research_artifacts where id=p_artifact_id and owner_id=p_user_id;
 select * into s from public.research_source_snapshots where artifact_id=a.id and content_hash=p_result->>'contentHash';
 if s.id is null then raise exception 'Saved source snapshot required';end if;
 if jsonb_typeof(p_result->'facts')='array'then
  if jsonb_array_length(p_result->'facts')>4 then raise exception 'Bounded project fact limit exceeded';end if;
  for fact in select value from jsonb_array_elements(p_result->'facts')loop
   span_start:=(fact->>'start')::integer;span_end:=(fact->>'end')::integer;
   if fact->>'predicate' not in('project_method','project_question')or span_start<0 or span_end<=span_start or length(fact->>'quote')not between 15 and 700 or substring(s.text_content from span_start+1 for span_end-span_start)is distinct from fact->>'quote'then raise exception 'Project fact source span is invalid';end if;
   -- A correction/withdrawal remains an override even when identical text appears in a newer snapshot.
   if not exists(select 1 from public.research_claims where artifact_id=a.id and predicate=fact->>'predicate' and statement=fact->>'quote')then
    insert into public.research_claims(profile_id,owner_id,project_id,artifact_id,snapshot_id,statement,predicate,origin,support_state,adoption,provenance)
    values(a.profile_id,p_user_id,a.project_id,a.id,s.id,fact->>'quote',fact->>'predicate','source','supported','candidate',jsonb_build_object('extractionVersion','local-project-v1','quote',fact->>'quote','start',span_start,'end',span_end,'section',fact->>'section','attribution','project_only'));
   end if;
  end loop;
 end if;
 return true;
end$$;
revoke all on function public.research_complete_enriched_artifact(uuid,uuid,uuid,jsonb)from public,anon,authenticated;
grant execute on function public.research_complete_enriched_artifact(uuid,uuid,uuid,jsonb)to service_role;
commit;
