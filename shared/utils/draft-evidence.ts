/** Drop only an exact mapped dependency whose complete supported text was removed.
 * A rewrite or missing map cannot silently discard evidence. */
export function pruneRemovedDraftEvidence(previousBody:string,nextBody:string,claimIds:string[],plan:any) {
 const supports: {sentence:string;claimIds:string[]}[]=plan?.sentenceSupports || []
 const removed=new Set(claimIds.filter(id=> {
  const mapped=supports.filter(s=>s.claimIds.includes(id))
  const statement=plan?.memberClaims?.find((c:any)=>c.id===id)?.statement
  return mapped.length>0 && mapped.every(s=>s.sentence && previousBody.includes(s.sentence) && !nextBody.includes(s.sentence)) && (!statement || !nextBody.includes(statement))
 }))
 return {evidence_claim_ids:claimIds.filter(id=>!removed.has(id)),proposal_plan:{...plan,memberClaims:(plan?.memberClaims || []).filter((c:any)=>!removed.has(c.id)),sentenceSupports:supports.filter(s=>nextBody.includes(s.sentence)).map(s=>({...s,claimIds:s.claimIds.filter(id=>!removed.has(id))}))}}
}
