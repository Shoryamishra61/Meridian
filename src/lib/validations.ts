/**
 * Meridian — Zod Validation Schemas
 * Three-layer validation: UI + API (Zod) + DB constraints
 * These schemas are used by both React Hook Form (UI) and tRPC procedures (API).
 */

import { z } from 'zod';
import { BUSINESS_RULES } from './constants';

const entityIdSchema = z.string().min(1, 'Identifier is required');

// ─── Goal Creation Schema ───────────────────────────────────────

export const goalCreateSchema = z.object({
  thrustAreaId: z.string().min(1, 'Thrust Area is required'),
  title: z
    .string()
    .min(1, 'Goal title is required')
    .max(BUSINESS_RULES.MAX_TITLE_LENGTH, `Title must be under ${BUSINESS_RULES.MAX_TITLE_LENGTH} characters`),
  description: z
    .string()
    .max(BUSINESS_RULES.MAX_DESCRIPTION_LENGTH, `Description must be under ${BUSINESS_RULES.MAX_DESCRIPTION_LENGTH} characters`)
    .optional()
    .or(z.literal('')),
  uomType: z.enum(['NUMERIC_MIN', 'NUMERIC_MAX', 'PERCENTAGE_MIN', 'PERCENTAGE_MAX', 'TIMELINE', 'ZERO_BASED']),
  target: z.number().min(0, 'Target must be 0 or greater'),
  targetDate: z.string().optional().nullable(),
  weightage: z
    .number()
    .min(BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL, `Minimum weightage is ${BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}%`)
    .max(BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL, `Maximum weightage is ${BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL}%`),
}).refine(
  (data) => {
    // Timeline UoM requires a target date
    if (data.uomType === 'TIMELINE' && !data.targetDate) {
      return false;
    }
    return true;
  },
  {
    message: 'Target date is required for Timeline goals',
    path: ['targetDate'],
  }
).refine(
  (data) => {
    // Zero-based UoM: target should be 0
    if (data.uomType === 'ZERO_BASED' && data.target !== 0) {
      return false;
    }
    return true;
  },
  {
    message: 'Zero-based goals must have a target of 0',
    path: ['target'],
  }
);

export type GoalCreateInput = z.infer<typeof goalCreateSchema>;

// ─── Goal Update Schema ─────────────────────────────────────────

export const goalUpdateSchema = goalCreateSchema.partial().extend({
  id: entityIdSchema,
});

export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;

// ─── Goal Sheet Submit Schema ────────────────────────────────────

export const goalSheetSubmitSchema = z.object({
  sheetId: entityIdSchema,
});

// ─── Manager Approval Schema ────────────────────────────────────

export const goalApproveSchema = z.object({
  sheetId: entityIdSchema,
  reviewNote: z.string().optional(),
  edits: z.array(z.object({
    goalId: entityIdSchema,
    target: z.number().positive('Target must be positive').optional(),
    weightage: z
      .number()
      .min(BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL)
      .max(BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL)
      .optional(),
  })).optional(),
});

export type GoalApproveInput = z.infer<typeof goalApproveSchema>;

// ─── Goal Return Schema ─────────────────────────────────────────

export const goalReturnSchema = z.object({
  sheetId: entityIdSchema,
  reason: z.string().min(1, 'Return reason is required'),
});

export type GoalReturnInput = z.infer<typeof goalReturnSchema>;

// ─── Goal Unlock Schema (Admin only) ────────────────────────────

export const goalUnlockSchema = z.object({
  sheetId: entityIdSchema,
  reason: z.string().min(1, 'Unlock reason is required'),
});

// ─── Quarterly Check-in Schema ──────────────────────────────────

export const checkinSubmitSchema = z.object({
  goalId: entityIdSchema,
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  actualAchievement: z.number().min(0, 'Achievement must be 0 or greater'),
  completionDate: z.string().optional().nullable(),
  status: z.enum(['NOT_STARTED', 'ON_TRACK', 'COMPLETED']),
  notes: z.string().optional(),
});

export type CheckinSubmitInput = z.infer<typeof checkinSubmitSchema>;

// ─── Manager Check-in Comment Schema ────────────────────────────

export const managerCheckinSchema = z.object({
  employeeId: entityIdSchema,
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  cycleId: entityIdSchema,
  comment: z
    .string()
    .min(
      BUSINESS_RULES.MIN_CHECKIN_COMMENT_LENGTH,
      `Check-in comment must be at least ${BUSINESS_RULES.MIN_CHECKIN_COMMENT_LENGTH} characters`
    ),
});

// ─── Shared Goal Push Schema ────────────────────────────────────

export const sharedGoalPushSchema = z.object({
  thrustAreaId: z.string().min(1),
  title: z.string().min(1).max(BUSINESS_RULES.MAX_TITLE_LENGTH),
  description: z.string().optional(),
  uomType: z.enum(['NUMERIC_MIN', 'NUMERIC_MAX', 'PERCENTAGE_MIN', 'PERCENTAGE_MAX', 'TIMELINE', 'ZERO_BASED']),
  target: z.number().min(0),
  targetDate: z.string().optional().nullable(),
  defaultWeightage: z
    .number()
    .min(BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL)
    .max(BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL),
  targetEmployeeIds: z.array(entityIdSchema).min(1, 'Select at least one employee'),
});

export type SharedGoalPushInput = z.infer<typeof sharedGoalPushSchema>;

// ─── Cycle Configuration Schema ─────────────────────────────────

export const cycleConfigSchema = z.object({
  name: z.string().min(1, 'Cycle name is required'),
  year: z.number().int().min(2020).max(2099),
  startDate: z.string(),
  endDate: z.string(),
  quarterlyWindows: z.object({
    goalSetting: z.object({ opens: z.string(), closes: z.string() }),
    q1: z.object({ opens: z.string(), closes: z.string() }),
    q2: z.object({ opens: z.string(), closes: z.string() }),
    q3: z.object({ opens: z.string(), closes: z.string() }),
    q4: z.object({ opens: z.string(), closes: z.string() }),
  }),
});

// ─── Escalation Rule Schema ─────────────────────────────────────

export const escalationRuleSchema = z.object({
  triggerType: z.enum([
    'GOAL_NOT_SUBMITTED',
    'GOAL_NOT_APPROVED',
    'CHECKIN_NOT_COMPLETED',
  ]),
  daysThreshold: z.number().int().min(1).max(30),
  notifyLevel: z.enum(['EMPLOYEE', 'MANAGER', 'HR']),
  isActive: z.boolean().default(true),
});

// ─── Login Schema ────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
