import { z } from 'zod'

export const joinInterests = [
  'Robotics & engineering',
  'AI & computing',
  'Life sciences',
  'Physics & mathematics',
  'Environment & sustainability',
  'Still exploring',
] as const
export const joinGoals = [
  'Find research partners',
  'Explore research ideas',
  'Prepare for competitions',
  'Learn research skills',
  'Get project feedback',
] as const
export const joinStages = [
  'No experience yet',
  'Classroom projects',
  'Independent projects',
  'Competitions or published research',
] as const
export const joinGrades = [
  '9th grade',
  '10th grade',
  '11th grade',
  '12th grade',
  'Other / not in high school',
] as const
export const joinSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(2, 'Please enter your name.').max(100),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email.')
    .max(254)
    .transform((value) => value.toLowerCase()),
  grade: z.enum(joinGrades, { error: 'Please choose your grade level.' }),
  interests: z
    .array(z.enum(joinInterests))
    .min(1, 'Choose at least one interest.')
    .max(6)
    .transform((value) => [...new Set(value)]),
  goals: z
    .array(z.enum(joinGoals))
    .min(1, 'Choose at least one way to get involved.')
    .max(5)
    .transform((value) => [...new Set(value)]),
  stage: z.enum(joinStages, { error: 'Please choose your current experience level.' }),
  note: z
    .string()
    .trim()
    .max(1000, 'Please keep your feedback under 1,000 characters.')
    .default(''),
  consent: z.literal(true, { error: 'Please agree to how we use your response.' }),
  website: z.string().max(200).default(''),
})
export type JoinSubmission = z.infer<typeof joinSchema>

// Neutralize spreadsheet formulas, including those preceded by whitespace.
export function csvCell(value: unknown) {
  const text = String(value ?? '')
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`
}
