import { z } from 'zod'

export const joinInterests = [
  'Robotics & engineering',
  'AI & computing',
  'Biology & medicine',
  'Chemistry & materials',
  'Physics & astronomy',
  'Mathematics & data science',
  'Environment & sustainability',
  'Psychology & social science',
  'Still exploring',
  'Other science or research area',
] as const
export const joinGoals = [
  'Compete at ISEF or a science fair',
  'Submit a paper or workshop poster',
  'Find an internship or lab experience',
  'Apply to a summer research program',
  'Build a long-term research project',
  'Learn research methods and statistics',
  'Find mentors or research partners',
  'Practice presenting and get feedback',
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
const fullName = (whose: string) =>
  z
    .string()
    .trim()
    .min(2, `Please enter the ${whose} full name.`)
    .max(100)
    .refine((value) => value.split(/\s+/).length >= 2, `Please enter the ${whose} full name.`)

export const joinIdentitySchema = z.object({
  name: fullName('student’s'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid student email.')
    .max(254)
    .transform((value) => value.toLowerCase()),
  grade: z.enum(joinGrades, { error: 'Please choose your grade level.' }),
})
const joinInterestFields = {
  interests: z
    .array(z.enum(joinInterests))
    .min(1, 'Choose at least one interest.')
    .max(joinInterests.length)
    .transform((value) => [...new Set(value)]),
  interestOther: z
    .string()
    .trim()
    .max(160, 'Please keep the other interest under 160 characters.')
    .default(''),
  stage: z.enum(joinStages, { error: 'Please choose your current experience level.' }),
}
const requireOtherInterest = (
  value: { interests: readonly string[]; interestOther: string },
  context: z.RefinementCtx,
) => {
  if (value.interests.includes('Other science or research area') && !value.interestOther) {
    context.addIssue({
      code: 'custom',
      path: ['interestOther'],
      message: 'Tell us which other science or research area interests you.',
    })
  }
}
export const joinInterestSchema = z.object(joinInterestFields).superRefine(requireOtherInterest)
export const joinGoalSchema = z.object({
  goals: z
    .array(z.enum(joinGoals))
    .min(1, 'Choose at least one research goal.')
    .max(joinGoals.length)
    .transform((value) => [...new Set(value)]),
  note: z
    .string()
    .trim()
    .max(1000, 'Please keep your feedback under 1,000 characters.')
    .default(''),
})
export const joinPermissionSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(3, 'Please enter your student ID.')
    .max(32, 'Please check your student ID.'),
  parentName: fullName('parent or guardian’s'),
  parentEmail: z
    .string()
    .trim()
    .email('Please enter a valid parent or guardian email.')
    .max(254)
    .transform((value) => value.toLowerCase()),
  parentPermission: z.literal(true, {
    error: 'Please confirm parent or guardian permission to participate.',
  }),
  consent: z.literal(true, { error: 'Please agree to how we use your response.' }),
})

export const joinSchema = z
  .object({
    requestId: z.string().uuid(),
    ...joinIdentitySchema.shape,
    ...joinInterestFields,
    ...joinGoalSchema.shape,
    ...joinPermissionSchema.shape,
    website: z.string().max(200).default(''),
  })
  .superRefine(requireOtherInterest)
export type JoinSubmission = z.infer<typeof joinSchema>

// Neutralize spreadsheet formulas, including those preceded by whitespace.
export function csvCell(value: unknown) {
  const text = String(value ?? '')
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`
}
