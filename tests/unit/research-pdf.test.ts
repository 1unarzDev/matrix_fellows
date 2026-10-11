import { expect, it } from 'vitest'
import { extractResearchPdf, researchPdfLimits } from '../../server/utils/research-pdf'
import { acquireResearchArtifact } from '../../server/utils/research-artifacts'
import { researchPdfFixture } from '../fixtures/research-pdf'
it('extracts bounded PDF paper text with exact per-page source provenance',async()=>{
 const result=await extractResearchPdf(researchPdfFixture(),'Team paper')
 expect(result.metadata.totalPages).toBe(2);expect(result.facts).toHaveLength(2)
 expect(result.facts.map(f=>f.section)).toEqual(['PDF page 1','PDF page 2'])
 for(const fact of result.facts)expect(Array.from(result.text).slice(fact.start,fact.end).join('')).toBe(fact.quote)
 expect(result.summary).toMatch(/contribution remain unconfirmed/)
})
it('rejects over-budget PDF pages, bytes, and malformed binary',async()=>{
 await expect(extractResearchPdf(researchPdfFixture(Array(13).fill('A paper.')))).rejects.toThrow(/too_many_pages/)
 await expect(extractResearchPdf(new Uint8Array(researchPdfLimits.bytes+1))).rejects.toThrow(/too_large/)
 await expect(extractResearchPdf(new TextEncoder().encode('not a pdf'))).rejects.toThrow(/invalid_pdf/)
})
it('only explicitly permitted institutional PDF endpoints feed the actual acquisition adapter',async()=>{
 let called=0,redirect=''
 const result=await acquireResearchArtifact('https://www.uta.edu/research/paper.pdf',async(_url,init)=>{called++;redirect=String(init?.redirect);return new Response(researchPdfFixture(),{headers:{'content-type':'application/pdf'}})})
 expect(result.state).toBe('ready');expect(result.metadata.adapter).toBe('public-pdf-text-v1');expect(redirect).toBe('error');expect(called).toBe(1)
 const unsupported=await acquireResearchArtifact('https://private.example/paper.pdf',async()=>{called++;return new Response(researchPdfFixture())})
 expect(unsupported.state).toBe('reference');expect(called).toBe(1)
})
