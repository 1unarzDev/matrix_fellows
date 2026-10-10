import { z } from 'zod'

export const extractedProjectFactSchema = z.object({
  predicate: z.enum(['project_method', 'project_question']),
  quote: z.string().min(15).max(700),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  section: z.string().max(120),
}).strict()
export type ExtractedProjectFact = z.infer<typeof extractedProjectFactSchema>
const method = /\b(?:we|this (?:project|work|study|repository)|our (?:project|work|study|model)|the (?:project|study|system|model))\b[^.!?\n]{0,130}\b(?:uses?|implements?|trains?|evaluates?|simulates?|measures?|compares?|analyses?|analyzes?|collects?|tests?)\b/i
const question = /\b(?:we (?:investigate|explore|study|ask|aim)|(?:research (?:question|objective)|(?:the|our|this) (?:goal|aim|objective)))\b/i
const unsafe = /\b(?:ignore (?:previous|prior)|system prompt|api[_ -]?key|password|access token|grant.*(?:role|access)|send (?:an )?email|run (?:npm|pip|sudo)|install dependencies)\b/i

/** Conservative local candidates, never member expertise. Offsets are Unicode codepoint positions in the immutable normalized snapshot text. */
export function extractProjectFacts(text: string, section = 'source text'): ExtractedProjectFact[] {
  const facts: ExtractedProjectFact[] = []
  const segments = /[^\n.!?]+(?:[.!?](?=\s|$)|(?=\n|$))/g
  for (const match of text.slice(0, 16000).matchAll(segments)) {
    const quote = match[0].trim()
    if (quote.length < 15 || quote.length > 700 || unsafe.test(quote)) continue
    const predicate = question.test(quote) ? 'project_question' : method.test(quote) ? 'project_method' : null
    if (!predicate || facts.filter(f => f.predicate === predicate).length >= 2 || facts.some(f => f.quote === quote)) continue
    const utf16Start = match.index! + match[0].indexOf(quote)
    const start = Array.from(text.slice(0, utf16Start)).length
    facts.push(extractedProjectFactSchema.parse({ predicate, quote, start, end: start + Array.from(quote).length, section }))
    if (facts.length === 4) break
  }
  return facts
}
export function projectFactSuggestions(facts: ExtractedProjectFact[]) {
  if (!facts.length) return ['Describe one research question you want to explore. An officer can prepare a focused learning or feedback inquiry without a work sample.']
  return [
    facts.some(f => f.predicate === 'project_method') ? 'Which of these methods did you personally use? Add only your own contribution; source methods describe the project.' : 'What part of this question would you like to explore?',
    'Choose a small reproduction, comparison, or focused question before proposing work. Time, data access, and supervision remain unconfirmed.',
  ]
}
