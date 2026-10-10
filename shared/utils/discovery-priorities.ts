import {stableResearchTopics} from './research-topics'
/** Local scheduling metadata only. Does not establish expertise or openness. */
export function uncoveredResearchInterests(interests:string[],covered:string[],projectTopics:string[]=[]){
 const coveredIds=new Set(stableResearchTopics(covered))
 const declared=[...new Set([...interests,...projectTopics])]
 const uncovered=declared.filter(label=>stableResearchTopics([label]).some(topic=>!coveredIds.has(topic)))
 return uncovered.length?uncovered:declared
}
export function freshnessWindow<T extends {id:string}>(sources:T[],latest:Map<string,string>,now:number){
 // Cool recently completed work for seven days when other reviewed sources exist.
 const stale=sources.filter(source=>!latest.get(source.id) || now-Date.parse(latest.get(source.id)!)>=7*86400000)
 return stale.length?stale:sources.slice(0,1)
}
