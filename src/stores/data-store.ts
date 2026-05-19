/**
 * Meridian — Demo Data Store
 *
 * Zustand-backed demo database. It enforces the
 * ATOMQUEST BRD behaviors even before the production Supabase/tRPC adapter is
 * wired in: locking, shared-goal sync, check-in locks, notifications, audit, and
 * escalation logs.
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BUSINESS_RULES,
  DEMO_ACCOUNTS,
  DEFAULT_THRUST_AREAS,
  PROGRESS_STATUS,
  type Quarter,
} from '@/lib/constants';
import {
  assertEmployeeCanEditSheet,
  validateGoalSheetForSubmission,
  validateManagerCheckinComment,
} from '@/server/domain/goal-policy';
import type {
  AuditLog,
  EscalationEvent,
  Goal,
  GoalCycle,
  GoalSheet,
  ManagerCheckin,
  NotificationEvent,
  QuarterlyUpdate,
  ThrustArea,
} from '@/types';
import {
  EXTRA_SHEETS,
  EXTRA_GOALS,
  EXTRA_UPDATES,
  EXTRA_CHECKINS,
  EXTRA_AUDIT_LOGS,
  EXTRA_NOTIFICATIONS,
} from './seed-data-extended';

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `mock-${Date.now()}-${idCounter}`;
}

function now(): Date {
  return new Date();
}

/**
 * Synchronous DJB2-based audit chain hash. Each entry's hash mixes the
 * previous hash with the entry payload, producing a tamper-evident chain that
 * is persisted with the record (no race between hashing and persistence).
 *
 * SubtleCrypto SHA-256 is intentionally NOT used here because it is async
 * and would require deferring `set()` — which would break referential
 * integrity if multiple audit entries arrive in the same tick.
 */
function computeAuditHashSync(payload: string, previousHash: string): string {
  const data = `${previousHash}|${payload}`;
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + data.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

let lastAuditHash = '0000000000000000';

const SEED_THRUST_AREAS: ThrustArea[] = DEFAULT_THRUST_AREAS.map((ta, i) => ({
  id: `ta-${i + 1}`,
  name: ta.name,
  description: ta.description,
  isActive: true,
}));

const SEED_CYCLE: GoalCycle = {
  id: 'cycle-fy2526',
  name: 'FY 2025-26',
  year: 2025,
  startDate: new Date('2025-05-01'),
  endDate: new Date('2026-04-30'),
  isActive: true,
  config: {
    goalSetting: { opens: '2025-05-01', closes: '2025-05-31' },
    q1: { opens: '2025-07-01', closes: '2025-07-31' },
    q2: { opens: '2025-10-01', closes: '2025-10-31' },
    q3: { opens: '2026-01-01', closes: '2026-01-31' },
    q4: { opens: '2026-03-01', closes: '2026-04-30' },
  },
  createdAt: new Date('2025-04-15'),
};

const SEED_SHEETS: GoalSheet[] = [
  {
    id: 'sheet-priya-001',
    employeeId: 'emp-priya-001',
    cycleId: SEED_CYCLE.id,
    status: 'DRAFT',
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    returnedAt: null,
    returnedReason: null,
    lockedAt: null,
    createdAt: new Date('2025-05-02'),
    updatedAt: new Date('2025-05-02'),
  },
  {
    id: 'sheet-rahul-001',
    employeeId: 'emp-rahul-002',
    cycleId: SEED_CYCLE.id,
    status: 'PENDING_APPROVAL',
    submittedAt: new Date('2025-05-12'),
    approvedAt: null,
    approvedBy: null,
    returnedAt: null,
    returnedReason: null,
    lockedAt: null,
    createdAt: new Date('2025-05-08'),
    updatedAt: new Date('2025-05-12'),
  },
  {
    id: 'sheet-ananya-001',
    employeeId: 'emp-ananya-003',
    cycleId: SEED_CYCLE.id,
    status: 'LOCKED',
    submittedAt: new Date('2025-05-10'),
    approvedAt: new Date('2025-05-13'),
    approvedBy: 'mgr-deepa-002',
    returnedAt: null,
    returnedReason: null,
    lockedAt: new Date('2025-05-13'),
    createdAt: new Date('2025-05-06'),
    updatedAt: new Date('2025-05-13'),
  },
  {
    id: 'sheet-vikram-001',
    employeeId: 'emp-vikram-004',
    cycleId: SEED_CYCLE.id,
    status: 'LOCKED',
    submittedAt: new Date('2025-05-09'),
    approvedAt: new Date('2025-05-11'),
    approvedBy: 'mgr-arjun-001',
    returnedAt: null,
    returnedReason: null,
    lockedAt: new Date('2025-05-11'),
    createdAt: new Date('2025-05-04'),
    updatedAt: new Date('2025-05-11'),
  },
  {
    id: 'sheet-meera-001',
    employeeId: 'emp-meera-005',
    cycleId: SEED_CYCLE.id,
    status: 'LOCKED',
    submittedAt: new Date('2025-05-14'),
    approvedAt: new Date('2025-05-16'),
    approvedBy: 'mgr-deepa-002',
    returnedAt: null,
    returnedReason: null,
    lockedAt: new Date('2025-05-16'),
    createdAt: new Date('2025-05-10'),
    updatedAt: new Date('2025-05-16'),
  },
];

const SEED_GOALS: Goal[] = [
  {
    id: 'goal-priya-001',
    sheetId: 'sheet-priya-001',
    thrustAreaId: 'ta-1',
    title: 'Grow strategic dealer revenue',
    description: 'Increase revenue from priority Sales & BD dealer accounts across the FY 2025-26 cycle.',
    uomType: 'NUMERIC_MIN',
    target: 18,
    targetDate: null,
    weightage: 40,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 0,
    createdAt: new Date('2025-05-02'),
    updatedAt: new Date('2025-05-02'),
  },
  {
    id: 'goal-priya-002',
    sheetId: 'sheet-priya-001',
    thrustAreaId: 'ta-3',
    title: 'Improve channel conversion rate',
    description: 'Raise qualified lead-to-order conversion by tightening partner follow-ups and proposal quality.',
    uomType: 'PERCENTAGE_MIN',
    target: 32,
    targetDate: null,
    weightage: 30,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 1,
    createdAt: new Date('2025-05-02'),
    updatedAt: new Date('2025-05-02'),
  },
  {
    id: 'goal-priya-003',
    sheetId: 'sheet-priya-001',
    thrustAreaId: 'ta-6',
    title: 'Reduce sales discount leakage',
    description: 'Keep average discount leakage within approved guardrails while protecting priority wins.',
    uomType: 'PERCENTAGE_MAX',
    target: 6,
    targetDate: null,
    weightage: 30,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 2,
    createdAt: new Date('2025-05-02'),
    updatedAt: new Date('2025-05-02'),
  },
  {
    id: 'goal-rahul-001',
    sheetId: 'sheet-rahul-001',
    thrustAreaId: 'ta-5',
    title: 'Ship fan diagnostics dashboard',
    description: 'Release the production monitoring dashboard for IoT service teams.',
    uomType: 'TIMELINE',
    target: 0,
    targetDate: new Date('2025-09-30'),
    weightage: 30,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 0,
    createdAt: new Date('2025-05-08'),
    updatedAt: new Date('2025-05-08'),
  },
  {
    id: 'goal-rahul-002',
    sheetId: 'sheet-rahul-001',
    thrustAreaId: 'ta-2',
    title: 'Reduce service API error rate',
    description: 'Lower the incident-producing API error rate across connected devices.',
    uomType: 'PERCENTAGE_MAX',
    target: 1.5,
    targetDate: null,
    weightage: 30,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 1,
    createdAt: new Date('2025-05-08'),
    updatedAt: new Date('2025-05-08'),
  },
  {
    id: 'goal-rahul-003',
    sheetId: 'sheet-rahul-001',
    thrustAreaId: 'ta-3',
    title: 'Improve customer app rating',
    description: 'Increase app quality by addressing top review themes.',
    uomType: 'NUMERIC_MIN',
    target: 4.6,
    targetDate: null,
    weightage: 40,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 2,
    createdAt: new Date('2025-05-08'),
    updatedAt: new Date('2025-05-08'),
  },
  {
    id: 'goal-ananya-001',
    sheetId: 'sheet-ananya-001',
    thrustAreaId: 'ta-2',
    title: 'Reduce service turnaround time',
    description: 'Lower average service closure TAT across western region.',
    uomType: 'NUMERIC_MAX',
    target: 48,
    targetDate: null,
    weightage: 40,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 0,
    createdAt: new Date('2025-05-06'),
    updatedAt: new Date('2025-05-13'),
  },
  {
    id: 'goal-ananya-002',
    sheetId: 'sheet-ananya-001',
    thrustAreaId: 'ta-7',
    title: 'Zero safety incidents',
    description: 'Keep field safety incidents at zero during the quarter.',
    uomType: 'ZERO_BASED',
    target: 0,
    targetDate: null,
    weightage: 30,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 1,
    createdAt: new Date('2025-05-06'),
    updatedAt: new Date('2025-05-13'),
  },
  {
    id: 'goal-ananya-003',
    sheetId: 'sheet-ananya-001',
    thrustAreaId: 'ta-3',
    title: 'Improve field CSAT',
    description: 'Lift customer satisfaction for completed service visits.',
    uomType: 'PERCENTAGE_MIN',
    target: 92,
    targetDate: null,
    weightage: 30,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 2,
    createdAt: new Date('2025-05-06'),
    updatedAt: new Date('2025-05-13'),
  },
  {
    id: 'goal-vikram-001',
    sheetId: 'sheet-vikram-001',
    thrustAreaId: 'ta-5',
    title: 'Launch predictive motor-health model',
    description: 'Ship the first production model for early fan motor fault detection.',
    uomType: 'TIMELINE',
    target: 0,
    targetDate: new Date('2025-09-15'),
    weightage: 35,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 0,
    createdAt: new Date('2025-05-04'),
    updatedAt: new Date('2025-05-11'),
  },
  {
    id: 'goal-vikram-002',
    sheetId: 'sheet-vikram-001',
    thrustAreaId: 'ta-2',
    title: 'Improve firmware deployment success',
    description: 'Raise first-attempt OTA deployment success across connected devices.',
    uomType: 'PERCENTAGE_MIN',
    target: 96,
    targetDate: null,
    weightage: 35,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 1,
    createdAt: new Date('2025-05-04'),
    updatedAt: new Date('2025-05-11'),
  },
  {
    id: 'goal-vikram-003',
    sheetId: 'sheet-vikram-001',
    thrustAreaId: 'ta-6',
    title: 'Reduce cloud telemetry cost per device',
    description: 'Optimize telemetry sampling and storage policy without losing diagnostics fidelity.',
    uomType: 'NUMERIC_MAX',
    target: 14,
    targetDate: null,
    weightage: 30,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 2,
    createdAt: new Date('2025-05-04'),
    updatedAt: new Date('2025-05-11'),
  },
  {
    id: 'goal-meera-001',
    sheetId: 'sheet-meera-001',
    thrustAreaId: 'ta-2',
    title: 'Reduce first-visit service repeat cases',
    description: 'Lower repeated visits by improving field diagnosis quality.',
    uomType: 'PERCENTAGE_MAX',
    target: 4,
    targetDate: null,
    weightage: 40,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 0,
    createdAt: new Date('2025-05-10'),
    updatedAt: new Date('2025-05-16'),
  },
  {
    id: 'goal-meera-002',
    sheetId: 'sheet-meera-001',
    thrustAreaId: 'ta-4',
    title: 'Complete technician certification wave',
    description: 'Certify the priority technician cohort on BLDC diagnostics.',
    uomType: 'NUMERIC_MIN',
    target: 120,
    targetDate: null,
    weightage: 35,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 1,
    createdAt: new Date('2025-05-10'),
    updatedAt: new Date('2025-05-16'),
  },
  {
    id: 'goal-meera-003',
    sheetId: 'sheet-meera-001',
    thrustAreaId: 'ta-7',
    title: 'Zero critical compliance misses',
    description: 'Maintain zero critical misses across regional service audits.',
    uomType: 'ZERO_BASED',
    target: 0,
    targetDate: null,
    weightage: 25,
    isShared: false,
    sharedFromId: null,
    isOwner: true,
    displayOrder: 2,
    createdAt: new Date('2025-05-10'),
    updatedAt: new Date('2025-05-16'),
  },
];

const DEFAULT_GOAL_SHEETS = [...SEED_SHEETS, ...EXTRA_SHEETS];
const DEFAULT_GOALS = [...SEED_GOALS, ...EXTRA_GOALS];

function mergeMissingById<T extends { id: string }>(current: T[] | undefined, defaults: T[]): T[] {
  const existing = current ?? [];
  const existingIds = new Set(existing.map((item) => item.id));
  return [...existing, ...defaults.filter((item) => !existingIds.has(item.id))];
}

const SEED_UPDATES: QuarterlyUpdate[] = [
  {
    id: 'update-ananya-q1-001',
    goalId: 'goal-ananya-001',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 50,
    completionDate: null,
    status: PROGRESS_STATUS.ON_TRACK,
    computedScore: 48 / 50,
    notes: 'TAT down from baseline, still above target.',
    updatedAt: new Date('2025-07-12'),
    updatedBy: 'emp-ananya-003',
  },
  {
    id: 'update-ananya-q1-002',
    goalId: 'goal-ananya-002',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 0,
    completionDate: null,
    status: PROGRESS_STATUS.COMPLETED,
    computedScore: 1,
    notes: 'No safety incidents reported.',
    updatedAt: new Date('2025-07-12'),
    updatedBy: 'emp-ananya-003',
  },
  {
    id: 'update-ananya-q1-003',
    goalId: 'goal-ananya-003',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 88,
    completionDate: null,
    status: PROGRESS_STATUS.ON_TRACK,
    computedScore: 88 / 92,
    notes: 'Follow-up program started.',
    updatedAt: new Date('2025-07-12'),
    updatedBy: 'emp-ananya-003',
  },
  {
    id: 'update-ananya-q2-001',
    goalId: 'goal-ananya-001',
    quarter: 'Q2',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 46,
    completionDate: null,
    status: PROGRESS_STATUS.ON_TRACK,
    computedScore: 48 / 46,
    notes: 'TAT crossed the target after spare allocation changes.',
    updatedAt: new Date('2025-10-14'),
    updatedBy: 'emp-ananya-003',
  },
  {
    id: 'update-ananya-q2-002',
    goalId: 'goal-ananya-002',
    quarter: 'Q2',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 1,
    completionDate: null,
    status: PROGRESS_STATUS.ON_TRACK,
    computedScore: 0,
    notes: 'One minor reportable incident; corrective action logged.',
    updatedAt: new Date('2025-10-14'),
    updatedBy: 'emp-ananya-003',
  },
  {
    id: 'update-ananya-q2-003',
    goalId: 'goal-ananya-003',
    quarter: 'Q2',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 93,
    completionDate: null,
    status: PROGRESS_STATUS.COMPLETED,
    computedScore: 93 / 92,
    notes: 'CSAT target exceeded.',
    updatedAt: new Date('2025-10-14'),
    updatedBy: 'emp-ananya-003',
  },
  {
    id: 'update-vikram-q1-001',
    goalId: 'goal-vikram-001',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 0,
    completionDate: new Date('2025-09-12'),
    status: PROGRESS_STATUS.COMPLETED,
    computedScore: 1,
    notes: 'Model deployed before the milestone date.',
    updatedAt: new Date('2025-07-18'),
    updatedBy: 'emp-vikram-004',
  },
  {
    id: 'update-vikram-q1-002',
    goalId: 'goal-vikram-002',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 93,
    completionDate: null,
    status: PROGRESS_STATUS.ON_TRACK,
    computedScore: 93 / 96,
    notes: 'Retry failure cluster isolated to two device batches.',
    updatedAt: new Date('2025-07-18'),
    updatedBy: 'emp-vikram-004',
  },
  {
    id: 'update-vikram-q1-003',
    goalId: 'goal-vikram-003',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 15.8,
    completionDate: null,
    status: PROGRESS_STATUS.ON_TRACK,
    computedScore: 14 / 15.8,
    notes: 'Archive policy changes started.',
    updatedAt: new Date('2025-07-18'),
    updatedBy: 'emp-vikram-004',
  },
  {
    id: 'update-vikram-q2-001',
    goalId: 'goal-vikram-002',
    quarter: 'Q2',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 96.5,
    completionDate: null,
    status: PROGRESS_STATUS.COMPLETED,
    computedScore: 96.5 / 96,
    notes: 'Deployment target stabilized.',
    updatedAt: new Date('2025-10-16'),
    updatedBy: 'emp-vikram-004',
  },
  {
    id: 'update-vikram-q2-002',
    goalId: 'goal-vikram-003',
    quarter: 'Q2',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 13.2,
    completionDate: null,
    status: PROGRESS_STATUS.COMPLETED,
    computedScore: 14 / 13.2,
    notes: 'Telemetry cost target beaten after compression rollout.',
    updatedAt: new Date('2025-10-16'),
    updatedBy: 'emp-vikram-004',
  },
  {
    id: 'update-meera-q1-001',
    goalId: 'goal-meera-001',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 4.8,
    completionDate: null,
    status: PROGRESS_STATUS.ON_TRACK,
    computedScore: 4 / 4.8,
    notes: 'Repeat cases improving but not below target.',
    updatedAt: new Date('2025-07-20'),
    updatedBy: 'emp-meera-005',
  },
  {
    id: 'update-meera-q1-002',
    goalId: 'goal-meera-002',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 78,
    completionDate: null,
    status: PROGRESS_STATUS.ON_TRACK,
    computedScore: 78 / 120,
    notes: 'Certification batch one completed.',
    updatedAt: new Date('2025-07-20'),
    updatedBy: 'emp-meera-005',
  },
  {
    id: 'update-meera-q1-003',
    goalId: 'goal-meera-003',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 0,
    completionDate: null,
    status: PROGRESS_STATUS.COMPLETED,
    computedScore: 1,
    notes: 'No critical audit misses.',
    updatedAt: new Date('2025-07-20'),
    updatedBy: 'emp-meera-005',
  },
  {
    id: 'update-meera-q2-001',
    goalId: 'goal-meera-001',
    quarter: 'Q2',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 3.7,
    completionDate: null,
    status: PROGRESS_STATUS.COMPLETED,
    computedScore: 4 / 3.7,
    notes: 'Repeat cases below target.',
    updatedAt: new Date('2025-10-21'),
    updatedBy: 'emp-meera-005',
  },
  {
    id: 'update-meera-q2-002',
    goalId: 'goal-meera-002',
    quarter: 'Q2',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 126,
    completionDate: null,
    status: PROGRESS_STATUS.COMPLETED,
    computedScore: 126 / 120,
    notes: 'Certification wave completed above target.',
    updatedAt: new Date('2025-10-21'),
    updatedBy: 'emp-meera-005',
  },
  {
    id: 'update-meera-q2-003',
    goalId: 'goal-meera-003',
    quarter: 'Q2',
    cycleId: SEED_CYCLE.id,
    actualAchievement: 0,
    completionDate: null,
    status: PROGRESS_STATUS.COMPLETED,
    computedScore: 1,
    notes: 'Still zero misses.',
    updatedAt: new Date('2025-10-21'),
    updatedBy: 'emp-meera-005',
  },
];

const SEED_MANAGER_CHECKINS: ManagerCheckin[] = [
  {
    id: 'checkin-ananya-q1-001',
    managerId: 'mgr-deepa-002',
    employeeId: 'emp-ananya-003',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    comment:
      'Reviewed TAT reduction, safety incident controls, and CSAT follow-ups. Agreed to accelerate spare allocation and maintain weekly safety reviews.',
    completedAt: new Date('2025-07-22'),
  },
  {
    id: 'checkin-vikram-q1-001',
    managerId: 'mgr-arjun-001',
    employeeId: 'emp-vikram-004',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    comment:
      'Predictive model milestone is healthy. Next action is to stabilize OTA success and complete telemetry cost optimization before Q2 close.',
    completedAt: new Date('2025-07-23'),
  },
  {
    id: 'checkin-meera-q1-001',
    managerId: 'mgr-deepa-002',
    employeeId: 'emp-meera-005',
    quarter: 'Q1',
    cycleId: SEED_CYCLE.id,
    comment:
      'Repeat cases and certification progress reviewed. Meera will prioritize field coaching and close certification gaps by October.',
    completedAt: new Date('2025-07-24'),
  },
];

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-seed-approval-001',
    entityType: 'goal_sheet',
    entityId: 'sheet-vikram-001',
    action: 'APPROVE',
    fieldName: 'status',
    oldValue: { status: 'PENDING_APPROVAL' },
    newValue: { status: 'LOCKED' },
    changedBy: 'mgr-arjun-001',
    changedAt: new Date('2025-05-11T10:20:00'),
    ipAddress: '10.24.8.12',
    userAgent: 'Meridian Demo',
  },
  {
    id: 'audit-seed-edit-001',
    entityType: 'goal',
    entityId: 'goal-rahul-002',
    action: 'MANAGER_EDIT',
    fieldName: 'weightage',
    oldValue: { weightage: 25 },
    newValue: { weightage: 30 },
    changedBy: 'mgr-arjun-001',
    changedAt: new Date('2025-05-12T15:45:00'),
    ipAddress: '10.24.8.12',
    userAgent: 'Meridian Demo',
  },
  {
    id: 'audit-seed-checkin-001',
    entityType: 'manager_checkin',
    entityId: 'checkin-vikram-q1-001',
    action: 'CHECKIN_COMPLETE',
    fieldName: 'Q1',
    oldValue: null,
    newValue: { employeeId: 'emp-vikram-004', quarter: 'Q1' },
    changedBy: 'mgr-arjun-001',
    changedAt: new Date('2025-07-23T11:10:00'),
    ipAddress: '10.24.8.12',
    userAgent: 'Meridian Demo',
  },
];

const SEED_NOTIFICATIONS: NotificationEvent[] = [
  {
    id: 'notification-seed-approval-001',
    type: 'GOAL_APPROVED',
    recipientId: 'emp-vikram-004',
    title: 'Goals approved and locked',
    message: 'Arjun Mehta approved your FY 2025-26 goal sheet. Achievement capture opens in the active quarterly window.',
    deepLink: '/goals',
    teamsCardJson: {
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        { type: 'TextBlock', text: 'Goals approved and locked', weight: 'Bolder', size: 'Medium' },
        { type: 'TextBlock', text: 'Arjun Mehta approved your FY 2025-26 goal sheet.', wrap: true },
      ],
      actions: [{ type: 'Action.OpenUrl', title: 'Open in Meridian', url: '/goals' }],
    },
    createdAt: new Date('2025-05-11T10:21:00'),
    readAt: null,
  },
  {
    id: 'notification-seed-reminder-001',
    type: 'CHECKIN_REMINDER',
    recipientId: 'mgr-deepa-002',
    title: 'Q1 check-in reminder',
    message: 'Ananya Iyer and Meera Kapoor have submitted Q1 achievement updates. Complete structured manager comments before the window closes.',
    deepLink: '/checkins',
    teamsCardJson: {
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        { type: 'TextBlock', text: 'Q1 check-in reminder', weight: 'Bolder', size: 'Medium' },
        { type: 'TextBlock', text: 'Complete structured manager comments before the window closes.', wrap: true },
      ],
      actions: [{ type: 'Action.OpenUrl', title: 'Open in Meridian', url: '/checkins' }],
    },
    createdAt: new Date('2025-07-21T09:00:00'),
    readAt: null,
  },
];

interface DataState {
  thrustAreas: ThrustArea[];
  cycles: GoalCycle[];
  goalSheets: GoalSheet[];
  goals: Goal[];
  quarterlyUpdates: QuarterlyUpdate[];
  managerCheckins: ManagerCheckin[];
  auditLogs: AuditLog[];
  notifications: NotificationEvent[];
  escalationEvents: EscalationEvent[];

  getOrCreateSheet: (employeeId: string, cycleId: string) => GoalSheet;
  getSheetById: (sheetId: string) => GoalSheet | undefined;
  getSheetsByEmployee: (employeeId: string) => GoalSheet[];
  getSheetsByManager: (managerId: string) => GoalSheet[];
  updateSheetStatus: (sheetId: string, status: GoalSheet['status'], extra?: Partial<GoalSheet>) => void;

  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'displayOrder'>) => Goal;
  /**
   * Update a goal. Pass `actor` to enforce role-aware authorization (e.g.,
   * employees cannot mutate goals while sheet is PENDING_APPROVAL). When
   * `actor` is omitted, only the simple status-based edit policy applies.
   */
  updateGoal: (goalId: string, updates: Partial<Goal>, actor?: { role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' }) => void;
  deleteGoal: (goalId: string) => void;
  getGoalsBySheet: (sheetId: string) => Goal[];
  getGoalById: (goalId: string) => Goal | undefined;

  submitQuarterlyUpdate: (update: Omit<QuarterlyUpdate, 'id' | 'updatedAt'>) => QuarterlyUpdate;
  getUpdatesByGoal: (goalId: string) => QuarterlyUpdate[];
  isQuarterLocked: (employeeId: string, quarter: Quarter, cycleId: string) => boolean;

  submitManagerCheckin: (checkin: Omit<ManagerCheckin, 'id' | 'completedAt'>) => ManagerCheckin;

  addAuditLog: (log: Omit<AuditLog, 'id' | 'changedAt'>) => void;
  addNotification: (event: Omit<NotificationEvent, 'id' | 'createdAt' | 'readAt' | 'teamsCardJson'>) => NotificationEvent;
  markNotificationRead: (notificationId: string) => void;
  runEscalationScan: (actorId: string, quarter: Quarter) => EscalationEvent[];

  resetToSeed: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      thrustAreas: SEED_THRUST_AREAS,
      cycles: [SEED_CYCLE],
      goalSheets: DEFAULT_GOAL_SHEETS,
      goals: DEFAULT_GOALS,
      quarterlyUpdates: [...SEED_UPDATES, ...EXTRA_UPDATES],
      managerCheckins: [...SEED_MANAGER_CHECKINS, ...EXTRA_CHECKINS],
      auditLogs: [...SEED_AUDIT_LOGS, ...EXTRA_AUDIT_LOGS],
      notifications: [...SEED_NOTIFICATIONS, ...EXTRA_NOTIFICATIONS],
      escalationEvents: [
        {
          id: 'esc-001',
          ruleId: 'rule-late-submit',
          targetUserId: 'emp-aditya-008',
          notifiedUserId: 'mgr-deepa-002',
          level: 'MANAGER',
          triggeredAt: new Date('2025-06-15T10:00:00'),
          resolvedAt: new Date('2025-06-16T14:30:00'),
          resolvedBy: 'emp-aditya-008',
          resolutionNote: 'Goals submitted after manager reminder.',
        },
        {
          id: 'esc-002',
          ruleId: 'rule-late-approve',
          targetUserId: 'emp-sneha-009',
          notifiedUserId: 'mgr-deepa-002',
          level: 'MANAGER',
          triggeredAt: new Date('2025-06-18T09:00:00'),
          resolvedAt: null,
          resolvedBy: null,
          resolutionNote: null,
        },
        {
          id: 'esc-003',
          ruleId: 'rule-checkin-overdue',
          targetUserId: 'emp-priya-003',
          notifiedUserId: 'mgr-arjun-001',
          level: 'MANAGER',
          triggeredAt: new Date('2025-08-05T08:00:00'),
          resolvedAt: new Date('2025-08-07T11:15:00'),
          resolvedBy: 'emp-priya-003',
          resolutionNote: 'Q1 check-in completed after follow-up.',
        },
        {
          id: 'esc-004',
          ruleId: 'rule-late-submit',
          targetUserId: 'emp-karan-010',
          notifiedUserId: 'admin-hr-001',
          level: 'HR',
          triggeredAt: new Date('2025-06-20T09:30:00'),
          resolvedAt: null,
          resolvedBy: null,
          resolutionNote: null,
        },
      ],

      getOrCreateSheet: (employeeId, cycleId) => {
        const state = get();
        const existing = state.goalSheets.find(
          (sheet) => sheet.employeeId === employeeId && sheet.cycleId === cycleId
        );
        if (existing) return existing;

        const newSheet: GoalSheet = {
          id: generateId(),
          employeeId,
          cycleId,
          status: 'DRAFT',
          submittedAt: null,
          approvedAt: null,
          approvedBy: null,
          returnedAt: null,
          returnedReason: null,
          lockedAt: null,
          createdAt: now(),
          updatedAt: now(),
        };
        set({ goalSheets: [...state.goalSheets, newSheet] });
        return newSheet;
      },

      getSheetById: (sheetId) => get().goalSheets.find((sheet) => sheet.id === sheetId),

      getSheetsByEmployee: (employeeId) =>
        get().goalSheets.filter((sheet) => sheet.employeeId === employeeId),

      getSheetsByManager: (managerId) => {
        const teamIds: string[] = DEMO_ACCOUNTS.filter((account) => account.managerId === managerId).map(
          (account) => account.id
        );
        return get().goalSheets.filter((sheet) => teamIds.includes(sheet.employeeId));
      },

      updateSheetStatus: (sheetId, status, extra = {}) => {
        const state = get();
        const sheetGoals = state.goals.filter((goal) => goal.sheetId === sheetId);
        if (status === 'PENDING_APPROVAL' || status === 'LOCKED' || status === 'APPROVED') {
          const policy = validateGoalSheetForSubmission(sheetGoals);
          if (!policy.ok) throw new Error(policy.message);
        }

        set((state) => ({
          goalSheets: state.goalSheets.map((sheet) =>
            sheet.id === sheetId ? { ...sheet, status, updatedAt: now(), ...extra } : sheet
          ),
        }));
      },

      addGoal: (goalData) => {
        const state = get();
        const sheetGoals = state.goals.filter((goal) => goal.sheetId === goalData.sheetId);
        const sheet = state.goalSheets.find((candidate) => candidate.id === goalData.sheetId);

        if (sheet && !goalData.isShared) {
          const editPolicy = assertEmployeeCanEditSheet(sheet);
          if (!editPolicy.ok) throw new Error(editPolicy.message);
        }

        if (sheetGoals.length >= BUSINESS_RULES.MAX_GOALS_PER_CYCLE) {
          throw new Error(`A goal sheet can contain at most ${BUSINESS_RULES.MAX_GOALS_PER_CYCLE} goals.`);
        }

        // Defense-in-depth input validation (beyond Zod) — protects the
        // store against malformed callers and persisted-state tampering.
        if (!Number.isFinite(goalData.weightage)) {
          throw new Error('Weightage must be a finite number.');
        }
        if (!Number.isInteger(goalData.weightage)) {
          throw new Error('Weightage must be a whole number.');
        }
        if (goalData.weightage < BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL) {
          throw new Error(`Minimum goal weightage is ${BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}%.`);
        }
        if (goalData.weightage > BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL) {
          throw new Error(`Maximum goal weightage is ${BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL}%.`);
        }
        if (!Number.isFinite(goalData.target) || goalData.target < 0) {
          throw new Error('Target value must be a non-negative number.');
        }

        const nextTotal = sheetGoals.reduce((sum, goal) => sum + goal.weightage, 0) + goalData.weightage;
        if (nextTotal > BUSINESS_RULES.TOTAL_WEIGHTAGE) {
          throw new Error(`This goal would make total weightage ${nextTotal}%. Reduce weightage before adding it.`);
        }

        const newGoal: Goal = {
          ...goalData,
          id: generateId(),
          displayOrder: sheetGoals.length,
          createdAt: now(),
          updatedAt: now(),
        };

        set({ goals: [...state.goals, newGoal] });
        return newGoal;
      },

      updateGoal: (goalId, updates, actor) => {
        const currentGoal = get().goals.find((goal) => goal.id === goalId);
        const sheet = currentGoal ? get().goalSheets.find((candidate) => candidate.id === currentGoal.sheetId) : null;

        if (sheet) {
          if (sheet.status === 'PENDING_APPROVAL') {
            // During PENDING_APPROVAL only managers/admins may edit (inline
            // approval workflow); employees see a read-only sheet. When no
            // actor is provided (legacy callers) we keep prior behavior and
            // let UI gating handle it.
            if (actor && actor.role === 'EMPLOYEE') {
              throw new Error('Goal sheet is locked while awaiting manager approval. Wait for the manager to approve or return it.');
            }
          } else {
            const editPolicy = assertEmployeeCanEditSheet(sheet);
            if (!editPolicy.ok) throw new Error(editPolicy.message);
          }
        }

        if (currentGoal?.isShared && !currentGoal.isOwner) {
          const blockedFields: Array<keyof Goal> = ['title', 'target', 'targetDate', 'uomType', 'thrustAreaId'];
          if (blockedFields.some((field) => field in updates)) {
            throw new Error('Shared goal recipients can only edit weightage. Title, target, UoM, and thrust area are read-only.');
          }
        }

        if (updates.weightage != null) {
          if (!Number.isFinite(updates.weightage)) {
            throw new Error('Weightage must be a finite number.');
          }
          if (!Number.isInteger(updates.weightage)) {
            throw new Error('Weightage must be a whole number.');
          }
          if (updates.weightage < BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL) {
            throw new Error(`Minimum goal weightage is ${BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}%.`);
          }
          if (updates.weightage > BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL) {
            throw new Error(`Maximum goal weightage is ${BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL}%.`);
          }
        }
        if (updates.target != null && (!Number.isFinite(updates.target) || updates.target < 0)) {
          throw new Error('Target value must be a non-negative number.');
        }

        if (updates.weightage != null && currentGoal) {
          const siblingGoals = get().goals.filter((goal) => goal.sheetId === currentGoal.sheetId);
          const nextTotal = siblingGoals.reduce(
            (sum, goal) => sum + (goal.id === goalId ? updates.weightage ?? goal.weightage : goal.weightage),
            0
          );
          if (nextTotal > BUSINESS_RULES.TOTAL_WEIGHTAGE) {
            throw new Error(`This change would make total weightage ${nextTotal}%. Keep the sheet at 100% or below.`);
          }
        }

        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === goalId ? { ...goal, ...updates, updatedAt: now() } : goal
          ),
        }));
      },

      deleteGoal: (goalId) => {
        const goal = get().goals.find((candidate) => candidate.id === goalId);
        const sheet = goal ? get().goalSheets.find((candidate) => candidate.id === goal.sheetId) : null;

        if (sheet) {
          const editPolicy = assertEmployeeCanEditSheet(sheet);
          if (!editPolicy.ok) throw new Error(editPolicy.message);
        }

        set((state) => ({
          goals: state.goals.filter((goal) => goal.id !== goalId),
          quarterlyUpdates: state.quarterlyUpdates.filter((update) => update.goalId !== goalId),
        }));
      },

      getGoalsBySheet: (sheetId) =>
        get()
          .goals.filter((goal) => goal.sheetId === sheetId)
          .sort((a, b) => a.displayOrder - b.displayOrder),

      getGoalById: (goalId) => get().goals.find((goal) => goal.id === goalId),

      submitQuarterlyUpdate: (updateData) => {
        const state = get();
        // Defense-in-depth bounds check on actualAchievement.
        const actual = updateData.actualAchievement;
        if (actual != null) {
          if (!Number.isFinite(actual)) {
            throw new Error('Actual achievement must be a finite number.');
          }
          if (actual < 0) {
            throw new Error('Actual achievement cannot be negative.');
          }
          if (actual > 1_000_000_000) {
            throw new Error('Actual achievement is unrealistically large.');
          }
        }
        const existing = state.quarterlyUpdates.find(
          (update) =>
            update.goalId === updateData.goalId &&
            update.quarter === updateData.quarter &&
            update.cycleId === updateData.cycleId
        );

        const update: QuarterlyUpdate = {
          ...updateData,
          id: existing?.id || generateId(),
          updatedAt: now(),
        };

        const nextUpdates = existing
          ? state.quarterlyUpdates.map((candidate) => (candidate.id === existing.id ? update : candidate))
          : [...state.quarterlyUpdates, update];

        const sourceGoal = state.goals.find((goal) => goal.id === updateData.goalId);
        if (sourceGoal?.isShared && sourceGoal.isOwner && sourceGoal.sharedFromId) {
          const linkedGoals = state.goals.filter(
            (goal) =>
              goal.sharedFromId === sourceGoal.sharedFromId &&
              goal.id !== sourceGoal.id &&
              !goal.isOwner
          );

          linkedGoals.forEach((linkedGoal) => {
            const linkedIndex = nextUpdates.findIndex(
              (candidate) =>
                candidate.goalId === linkedGoal.id &&
                candidate.quarter === updateData.quarter &&
                candidate.cycleId === updateData.cycleId
            );
            const linkedUpdate: QuarterlyUpdate = {
              ...update,
              id: linkedIndex >= 0 ? nextUpdates[linkedIndex].id : generateId(),
              goalId: linkedGoal.id,
              updatedAt: now(),
            };

            if (linkedIndex >= 0) nextUpdates[linkedIndex] = linkedUpdate;
            else nextUpdates.push(linkedUpdate);
          });

          if (linkedGoals.length > 0) {
            get().addAuditLog({
              entityType: 'shared_goal',
              entityId: sourceGoal.sharedFromId,
              action: 'SYNC_ACHIEVEMENT',
              fieldName: 'actualAchievement',
              oldValue: null,
              newValue: {
                quarter: updateData.quarter,
                sourceGoalId: sourceGoal.id,
                syncedGoalIds: linkedGoals.map((goal) => goal.id),
                actualAchievement: updateData.actualAchievement,
              },
              changedBy: updateData.updatedBy,
              ipAddress: null,
              userAgent: null,
            });
          }
        }

        set({ quarterlyUpdates: nextUpdates });
        return update;
      },

      getUpdatesByGoal: (goalId) =>
        get().quarterlyUpdates.filter((update) => update.goalId === goalId),

      isQuarterLocked: (employeeId, quarter, cycleId) =>
        get().managerCheckins.some(
          (checkin) =>
            checkin.employeeId === employeeId &&
            checkin.quarter === quarter &&
            checkin.cycleId === cycleId
        ),

      submitManagerCheckin: (checkinData) => {
        const commentPolicy = validateManagerCheckinComment(checkinData.comment);
        if (!commentPolicy.ok) throw new Error(commentPolicy.message);

        // Defense in depth: the employee must report to this manager.
        const employee = DEMO_ACCOUNTS.find((account) => account.id === checkinData.employeeId);
        if (!employee) {
          throw new Error('Employee not found.');
        }
        if (employee.managerId !== checkinData.managerId) {
          throw new Error('Only the assigned manager can complete this check-in.');
        }

        // Prevent duplicate check-ins for the same employee/quarter/cycle.
        const duplicate = get().managerCheckins.some(
          (existing) =>
            existing.employeeId === checkinData.employeeId &&
            existing.quarter === checkinData.quarter &&
            existing.cycleId === checkinData.cycleId
        );
        if (duplicate) {
          throw new Error('A check-in already exists for this employee and quarter.');
        }

        const checkin: ManagerCheckin = {
          ...checkinData,
          id: generateId(),
          completedAt: now(),
        };
        set((state) => ({
          managerCheckins: [...state.managerCheckins, checkin],
        }));
        get().addAuditLog({
          entityType: 'manager_checkin',
          entityId: checkin.id,
          action: 'CHECKIN_COMPLETE',
          fieldName: checkin.quarter,
          oldValue: null,
          newValue: { employeeId: checkin.employeeId, quarter: checkin.quarter },
          changedBy: checkin.managerId,
          ipAddress: null,
          userAgent: null,
        });
        return checkin;
      },

      addAuditLog: (logData) => {
        const changedAt = now();
        // Tamper-evidence: compute the chain hash synchronously so it is
        // guaranteed to be persisted as part of the log record.
        const payload = JSON.stringify({
          action: logData.action,
          entityId: logData.entityId,
          changedBy: logData.changedBy,
          ts: changedAt.toISOString(),
        });
        const integrityHash = computeAuditHashSync(payload, lastAuditHash);
        lastAuditHash = integrityHash;

        const log: AuditLog = {
          ...logData,
          id: generateId(),
          changedAt,
          integrityHash,
        };
        set((state) => ({
          auditLogs: [log, ...state.auditLogs],
        }));
      },

      addNotification: (eventData) => {
        const event: NotificationEvent = {
          ...eventData,
          id: generateId(),
          createdAt: now(),
          readAt: null,
          teamsCardJson: {
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              { type: 'TextBlock', text: eventData.title, weight: 'Bolder', size: 'Medium' },
              { type: 'TextBlock', text: eventData.message, wrap: true },
            ],
            actions: [{ type: 'Action.OpenUrl', title: 'Open in Meridian', url: eventData.deepLink }],
          },
        };
        set((state) => ({ notifications: [event, ...state.notifications] }));
        return event;
      },

      markNotificationRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === notificationId ? { ...notification, readAt: now() } : notification
          ),
        }));
      },

      runEscalationScan: (actorId, quarter) => {
        const state = get();
        const activeCycle = state.cycles.find((cycle) => cycle.isActive);
        if (!activeCycle) return [];

        const createdEvents: EscalationEvent[] = [];
        const employees = DEMO_ACCOUNTS.filter((account) => account.role === 'EMPLOYEE');
        const hr = DEMO_ACCOUNTS.find((account) => account.role === 'ADMIN');

        const addEscalation = (
          employeeId: string,
          notifiedUserId: string,
          ruleId: EscalationEvent['ruleId'],
          level: string,
          message: string
        ) => {
          const event: EscalationEvent = {
            id: generateId(),
            ruleId,
            targetUserId: employeeId,
            notifiedUserId,
            level,
            triggeredAt: now(),
            resolvedAt: null,
            resolvedBy: null,
            resolutionNote: null,
          };
          createdEvents.push(event);
          get().addNotification({
            type: 'ESCALATION',
            recipientId: notifiedUserId,
            title: 'Escalation raised',
            message,
            deepLink: '/admin/escalations',
          });
        };

        employees.forEach((employee) => {
          const sheet = state.goalSheets.find(
            (candidate) => candidate.employeeId === employee.id && candidate.cycleId === activeCycle.id
          );
          const manager = DEMO_ACCOUNTS.find((account) => account.id === employee.managerId);

          if (!sheet || sheet.status === 'DRAFT' || sheet.status === 'RETURNED') {
            addEscalation(
              employee.id,
              employee.id,
              'GOAL_NOT_SUBMITTED',
              'EMPLOYEE',
              `${employee.name} has not submitted goals for ${activeCycle.name}.`
            );
            if (manager) {
              addEscalation(
                employee.id,
                manager.id,
                'GOAL_NOT_SUBMITTED',
                'MANAGER',
                `${employee.name}'s goal sheet is pending submission.`
              );
            }
          }

          if (sheet?.status === 'PENDING_APPROVAL' && manager) {
            addEscalation(
              employee.id,
              manager.id,
              'GOAL_NOT_APPROVED',
              'MANAGER',
              `${employee.name}'s submitted goals are awaiting manager approval.`
            );
            if (hr) {
              addEscalation(
                employee.id,
                hr.id,
                'GOAL_NOT_APPROVED',
                'HR',
                `${manager.name} has a pending approval for ${employee.name}.`
              );
            }
          }

          const employeeGoals = sheet ? state.goals.filter((goal) => goal.sheetId === sheet.id) : [];
          const isApproved = sheet?.status === 'LOCKED' || sheet?.status === 'APPROVED';
          const allUpdated =
            employeeGoals.length > 0 &&
            employeeGoals.every((goal) =>
              state.quarterlyUpdates.some((update) => update.goalId === goal.id && update.quarter === quarter)
            );
          if (isApproved && !allUpdated && manager) {
            addEscalation(
              employee.id,
              manager.id,
              'CHECKIN_NOT_COMPLETED',
              'MANAGER',
              `${employee.name} has not completed ${quarter} achievement capture.`
            );
          }
        });

        set((latest) => ({ escalationEvents: [...createdEvents, ...latest.escalationEvents] }));
        get().addAuditLog({
          entityType: 'escalation_scan',
          entityId: activeCycle.id,
          action: 'ESCALATION_SCAN',
          fieldName: quarter,
          oldValue: null,
          newValue: { created: createdEvents.length },
          changedBy: actorId,
          ipAddress: null,
          userAgent: null,
        });
        return createdEvents;
      },

      resetToSeed: () => {
        set({
          thrustAreas: SEED_THRUST_AREAS,
          cycles: [SEED_CYCLE],
          goalSheets: DEFAULT_GOAL_SHEETS,
          goals: DEFAULT_GOALS,
          quarterlyUpdates: [...SEED_UPDATES, ...EXTRA_UPDATES],
          managerCheckins: [...SEED_MANAGER_CHECKINS, ...EXTRA_CHECKINS],
          auditLogs: [...SEED_AUDIT_LOGS, ...EXTRA_AUDIT_LOGS],
          notifications: [...SEED_NOTIFICATIONS, ...EXTRA_NOTIFICATIONS],
          escalationEvents: [],
        });
      },
    }),
    {
      name: 'meridian-data',
      version: 3,
      migrate: (persisted, version) => {
        // Version 0/undefined = pre-versioned stale data — wipe and use fresh defaults
        if (!version || version < 2) return {} as DataState;
        const persistedState = persisted as Partial<DataState> | undefined;
        if (!persistedState) return {} as DataState;
        return {
          ...persistedState,
          goalSheets: mergeMissingById(persistedState?.goalSheets, DEFAULT_GOAL_SHEETS),
          goals: mergeMissingById(persistedState?.goals, DEFAULT_GOALS),
          quarterlyUpdates: mergeMissingById(persistedState?.quarterlyUpdates, [...SEED_UPDATES, ...EXTRA_UPDATES]),
          managerCheckins: mergeMissingById(persistedState?.managerCheckins, [...SEED_MANAGER_CHECKINS, ...EXTRA_CHECKINS]),
          auditLogs: mergeMissingById(persistedState?.auditLogs, [...SEED_AUDIT_LOGS, ...EXTRA_AUDIT_LOGS]),
          notifications: mergeMissingById(persistedState?.notifications, [...SEED_NOTIFICATIONS, ...EXTRA_NOTIFICATIONS]),
        } as DataState;
      },
    }
  )
);
