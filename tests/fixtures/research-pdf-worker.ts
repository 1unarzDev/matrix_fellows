import { acquireResearchArtifact } from '../../server/utils/research-artifacts'
import { researchPdfFixture } from './research-pdf'
/** Isolated local workerd validation harness; never deployed with the application. */
export default {
 async fetch(request: Request) {
  const overPages=new URL(request.url).searchParams.get('overPages')==='true'
  try {
   const fixture=overPages?researchPdfFixture(Array(13).fill('A paper.')):researchPdfFixture()
   const result=await acquireResearchArtifact('https://www.uta.edu/research/fixture.pdf',async()=>new Response(fixture,{headers:{'content-type':'application/pdf'}}))
   const spans=result.facts.every(fact=>Array.from(result.text).slice(fact.start,fact.end).join('')===fact.quote)
   return Response.json({state:result.state,adapter:result.metadata.adapter,facts:result.facts,pages:'totalPages'in result.metadata?result.metadata.totalPages:null,spans})
  } catch(error) { return Response.json({error:error instanceof Error?error.message:'parse_failed'},{status:422}) }
 },
}
