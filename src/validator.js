import { z } from 'zod'

export const BlockedIntervalSchema = z.object({
  weekday: z.enum(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
})

export const ConstraintsSchema = z.object({
  hardConstraints: z.object({
    blockedDays: z.array(z.enum(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'])),
    blockedIntervals: z.array(BlockedIntervalSchema),
    noOverlap: z.boolean(),
  }),
  softPreferences: z.object({
    shiftBias: z.enum(['morning', 'afternoon', 'any']),
    maxGapHours: z.number().nonnegative(),
    consecutiveBlocks: z.boolean(),
    preferredProfessorIds: z.array(z.string()),
  }),
})

/**
 * Parses and validates raw LLM output against the Zod schema.
 */
export function validateConstraints(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    return { validJson: false, schemaValid: false, data: null, error: 'Empty content' }
  }

  // Sanitize Markdown backticks if the model added ```json
  let clean = rawContent.trim()
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/i, '').replace(/```$/s, '')
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/```$/s, '')
  }
  clean = clean.trim()

  let parsed = null
  try {
    parsed = JSON.parse(clean)
  } catch (err) {
    return { validJson: false, schemaValid: false, data: null, error: `Invalid JSON syntax: ${err.message}` }
  }

  const result = ConstraintsSchema.safeParse(parsed)
  if (!result.success) {
    return { validJson: true, schemaValid: false, data: parsed, error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') }
  }

  return { validJson: true, schemaValid: true, data: result.data, error: null }
}

/**
 * Computes an accuracy score (0 to 100%) by comparing the parsed output against the expected ground truth.
 */
export function evaluateAccuracy(actual, expected) {
  if (!actual || !expected) return 0

  let totalChecks = 0
  let passedChecks = 0

  // 1. Blocked days match
  totalChecks++
  const actualDays = [...(actual.hardConstraints?.blockedDays || [])].sort()
  const expectedDays = [...(expected.hardConstraints?.blockedDays || [])].sort()
  if (JSON.stringify(actualDays) === JSON.stringify(expectedDays)) {
    passedChecks++
  }

  // 2. Blocked intervals count and weekdays match
  totalChecks++
  const actualIntervals = actual.hardConstraints?.blockedIntervals || []
  const expectedIntervals = expected.hardConstraints?.blockedIntervals || []
  if (actualIntervals.length === expectedIntervals.length) {
    passedChecks++
  }

  // 3. noOverlap
  totalChecks++
  if (actual.hardConstraints?.noOverlap === expected.hardConstraints?.noOverlap) {
    passedChecks++
  }

  // 4. shiftBias
  totalChecks++
  if (actual.softPreferences?.shiftBias === expected.softPreferences?.shiftBias) {
    passedChecks++
  }

  // 5. consecutiveBlocks
  totalChecks++
  if (actual.softPreferences?.consecutiveBlocks === expected.softPreferences?.consecutiveBlocks) {
    passedChecks++
  }

  return Math.round((passedChecks / totalChecks) * 100)
}
