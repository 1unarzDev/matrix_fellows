import {expect,it} from 'vitest'
import {freshnessWindow,uncoveredResearchInterests} from '../../shared/utils/discovery-priorities'
it('prefers uncovered stable topics and cools recently acquired sources without blocking discovery',()=>{
 expect(uncoveredResearchInterests(['Robotics & engineering','Chemistry'],['Robotics'])).toEqual(['Chemistry'])
 const sources=[{id:'fresh'},{id:'never'}],now=Date.parse('2026-10-09')
 expect(freshnessWindow(sources,new Map([['fresh','2026-10-08']]),now)).toEqual([{id:'never'}])
 expect(freshnessWindow([{id:'fresh'}],new Map([['fresh','2026-10-08']]),now)).toEqual([{id:'fresh'}])
})
