export type DraftRevisionAction = 'shorten' | 'smaller_ask' | 'direct' | 'remove_claim'
export interface SentenceSupport { sentence: string; claimIds: string[] }
/** Local text transformations never transmit a private editor buffer. */
export function proposeLocalDraftRevision(input: {body:string;action:DraftRevisionAction;claimId?:string;supports?:SentenceSupport[]}) {
 let body=input.body
 const notices:string[]=[]
 if(input.action==='remove_claim') {
  const sentences=(input.supports || []).filter(s=>input.claimId && s.claimIds.includes(input.claimId))
  const exact=sentences.filter(s=>s.sentence && body.includes(s.sentence))
  if(!exact.length) notices.push('This claim has no unchanged mapped sentence. Select and remove its text manually.')
  for(const s of exact) body=body.replace(s.sentence,'')
 } else if(input.action==='smaller_ask') {
  const paragraphs=body.split(/\n\n/)
  const index=paragraphs.findIndex(p=>p.includes('?') && /^(Would|Could|Which|Is there)/.test(p.trim()))
  if(index>=0){
   const topic=/understanding (.+)\?$/.exec(paragraphs[index]!)?.[1]
   paragraphs[index]=topic?`Could you point us to one public resource on ${topic}?`:'Could we send one focused question by email before discussing a pilot?'
   body=paragraphs.filter(p=>!p.startsWith('One possible starting point is ')).join('\n\n')
  } else notices.push('No explicit ask was recognized; edit the request directly.')
 } else if(input.action==='direct') {
  body=body.replace(/I was wondering (?:if|whether) you (?:might|would) /gi,'Would you ')
   .replace(/I noticed this description of your research: /g,'Your page describes ')
   .replace(/Would you be open to a brief conversation about /g,'Could we discuss ')
 } else {
  body=body.replace(/\bI (?:am|would be) (?:very |particularly )?excited (?:about|by) [^.]+\.\s*/gi,'')
   .replace(/\bI hope this (?:email|message) finds you well\.\s*/gi,'')
   .replace(/I noticed this description of your research: /g,'Your page describes ')
   .replace(/They have shared an interest in /g,'Their stated interests include ')
 }
 body=body.replace(/\n{3,}/g,'\n\n').trim()
 if(body===input.body && !notices.length) notices.push('No safe change was needed. Your current wording is preserved.')
 return {body,notices}
}
