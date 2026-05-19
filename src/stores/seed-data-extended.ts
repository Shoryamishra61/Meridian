/**
 * Meridian — Extended Seed Data
 * Additional goal sheets, goals, updates, and audit logs for expanded org.
 * Imported by data-store.ts to enrich the demo.
 */

import type { Goal, GoalSheet, QuarterlyUpdate, ManagerCheckin, AuditLog, NotificationEvent } from '@/types';
import { PROGRESS_STATUS } from '@/lib/constants';

const CYCLE_ID = 'cycle-fy2526';

// ─── Additional Goal Sheets ─────────────────────────────────────

export const EXTRA_SHEETS: GoalSheet[] = [
  { id: 'sheet-sanjay-001', employeeId: 'emp-sanjay-006', cycleId: CYCLE_ID, status: 'LOCKED', submittedAt: new Date('2025-05-11'), approvedAt: new Date('2025-05-14'), approvedBy: 'mgr-neha-003', returnedAt: null, returnedReason: null, lockedAt: new Date('2025-05-14'), createdAt: new Date('2025-05-07'), updatedAt: new Date('2025-05-14') },
  { id: 'sheet-divya-001', employeeId: 'emp-divya-007', cycleId: CYCLE_ID, status: 'LOCKED', submittedAt: new Date('2025-05-12'), approvedAt: new Date('2025-05-15'), approvedBy: 'mgr-rohan-004', returnedAt: null, returnedReason: null, lockedAt: new Date('2025-05-15'), createdAt: new Date('2025-05-08'), updatedAt: new Date('2025-05-15') },
  { id: 'sheet-karthik-001', employeeId: 'emp-karthik-008', cycleId: CYCLE_ID, status: 'PENDING_APPROVAL', submittedAt: new Date('2025-05-18'), approvedAt: null, approvedBy: null, returnedAt: null, returnedReason: null, lockedAt: null, createdAt: new Date('2025-05-12'), updatedAt: new Date('2025-05-18') },
  { id: 'sheet-sneha-001', employeeId: 'emp-sneha-009', cycleId: CYCLE_ID, status: 'LOCKED', submittedAt: new Date('2025-05-13'), approvedAt: new Date('2025-05-16'), approvedBy: 'mgr-rohan-004', returnedAt: null, returnedReason: null, lockedAt: new Date('2025-05-16'), createdAt: new Date('2025-05-09'), updatedAt: new Date('2025-05-16') },
  { id: 'sheet-aditya-001', employeeId: 'emp-aditya-010', cycleId: CYCLE_ID, status: 'RETURNED', submittedAt: new Date('2025-05-15'), approvedAt: null, approvedBy: null, returnedAt: new Date('2025-05-17'), returnedReason: 'Weightage for cost targets needs rebalancing — please reduce Innovation from 40% to 25%.', lockedAt: null, createdAt: new Date('2025-05-10'), updatedAt: new Date('2025-05-17') },
];

// ─── Additional Goals ───────────────────────────────────────────

export const EXTRA_GOALS: Goal[] = [
  // Sanjay (Marketing) — 3 goals = 100%
  { id: 'goal-sanjay-001', sheetId: 'sheet-sanjay-001', thrustAreaId: 'ta-1', title: 'Grow brand awareness score', description: 'Increase unaided brand recall in tier-2 cities.', uomType: 'PERCENTAGE_MIN', target: 35, targetDate: null, weightage: 35, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 0, createdAt: new Date('2025-05-07'), updatedAt: new Date('2025-05-14') },
  { id: 'goal-sanjay-002', sheetId: 'sheet-sanjay-001', thrustAreaId: 'ta-6', title: 'Achieve digital campaign ROAS', description: 'Maintain Return on Ad Spend above 4x across channels.', uomType: 'NUMERIC_MIN', target: 4, targetDate: null, weightage: 35, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 1, createdAt: new Date('2025-05-07'), updatedAt: new Date('2025-05-14') },
  { id: 'goal-sanjay-003', sheetId: 'sheet-sanjay-001', thrustAreaId: 'ta-5', title: 'Launch monsoon campaign on time', description: 'Execute the seasonal product push campaign.', uomType: 'TIMELINE', target: 0, targetDate: new Date('2025-06-15'), weightage: 30, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 2, createdAt: new Date('2025-05-07'), updatedAt: new Date('2025-05-14') },

  // Divya (Finance) — 3 goals = 100%
  { id: 'goal-divya-001', sheetId: 'sheet-divya-001', thrustAreaId: 'ta-2', title: 'Reduce monthly close cycle time', description: 'Shorten working days to complete monthly financial close.', uomType: 'NUMERIC_MAX', target: 5, targetDate: null, weightage: 40, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 0, createdAt: new Date('2025-05-08'), updatedAt: new Date('2025-05-15') },
  { id: 'goal-divya-002', sheetId: 'sheet-divya-001', thrustAreaId: 'ta-2', title: 'Improve forecast accuracy', description: 'Reduce variance between forecast and actual quarterly results.', uomType: 'PERCENTAGE_MAX', target: 5, targetDate: null, weightage: 30, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 1, createdAt: new Date('2025-05-08'), updatedAt: new Date('2025-05-15') },
  { id: 'goal-divya-003', sheetId: 'sheet-divya-001', thrustAreaId: 'ta-7', title: 'Complete internal audit findings', description: 'Close all high-priority audit observations by deadline.', uomType: 'TIMELINE', target: 0, targetDate: new Date('2025-12-31'), weightage: 30, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 2, createdAt: new Date('2025-05-08'), updatedAt: new Date('2025-05-15') },

  // Karthik (Marketing) — 3 goals = 100%
  { id: 'goal-karthik-001', sheetId: 'sheet-karthik-001', thrustAreaId: 'ta-3', title: 'Improve customer app engagement', description: 'Increase DAU/MAU ratio for the consumer mobile app.', uomType: 'PERCENTAGE_MIN', target: 28, targetDate: null, weightage: 35, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 0, createdAt: new Date('2025-05-12'), updatedAt: new Date('2025-05-18') },
  { id: 'goal-karthik-002', sheetId: 'sheet-karthik-001', thrustAreaId: 'ta-1', title: 'Generate marketing qualified leads', description: 'Drive inbound MQL volume from content and digital.', uomType: 'NUMERIC_MIN', target: 500, targetDate: null, weightage: 35, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 1, createdAt: new Date('2025-05-12'), updatedAt: new Date('2025-05-18') },
  { id: 'goal-karthik-003', sheetId: 'sheet-karthik-001', thrustAreaId: 'ta-6', title: 'Reduce cost per lead', description: 'Optimize CPL across paid acquisition channels.', uomType: 'NUMERIC_MAX', target: 120, targetDate: null, weightage: 30, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 2, createdAt: new Date('2025-05-12'), updatedAt: new Date('2025-05-18') },

  // Sneha (Finance) — 3 goals = 100%
  { id: 'goal-sneha-001', sheetId: 'sheet-sneha-001', thrustAreaId: 'ta-6', title: 'Optimize vendor payment cycle', description: 'Reduce average days from invoice to payment.', uomType: 'NUMERIC_MAX', target: 15, targetDate: null, weightage: 35, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 0, createdAt: new Date('2025-05-09'), updatedAt: new Date('2025-05-16') },
  { id: 'goal-sneha-002', sheetId: 'sheet-sneha-001', thrustAreaId: 'ta-7', title: 'Achieve zero tax compliance gaps', description: 'Maintain clean GST filing record with no penalties.', uomType: 'ZERO_BASED', target: 0, targetDate: null, weightage: 30, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 1, createdAt: new Date('2025-05-09'), updatedAt: new Date('2025-05-16') },
  { id: 'goal-sneha-003', sheetId: 'sheet-sneha-001', thrustAreaId: 'ta-2', title: 'Automate expense reporting', description: 'Migrate team to automated expense flow, reducing manual processing.', uomType: 'PERCENTAGE_MIN', target: 90, targetDate: null, weightage: 35, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 2, createdAt: new Date('2025-05-09'), updatedAt: new Date('2025-05-16') },
];

// ─── Additional Quarterly Updates (Q1 + Q2) ─────────────────────

export const EXTRA_UPDATES: QuarterlyUpdate[] = [
  // Sanjay Q1
  { id: 'upd-sanjay-q1-1', goalId: 'goal-sanjay-001', quarter: 'Q1', cycleId: CYCLE_ID, actualAchievement: 29, completionDate: null, status: PROGRESS_STATUS.ON_TRACK, computedScore: 29 / 35, notes: 'Brand recall in metros strong; tier-2 needs push.', updatedAt: new Date('2025-07-14'), updatedBy: 'emp-sanjay-006' },
  { id: 'upd-sanjay-q1-2', goalId: 'goal-sanjay-002', quarter: 'Q1', cycleId: CYCLE_ID, actualAchievement: 3.6, completionDate: null, status: PROGRESS_STATUS.ON_TRACK, computedScore: 3.6 / 4, notes: 'ROAS improving after creative refresh.', updatedAt: new Date('2025-07-14'), updatedBy: 'emp-sanjay-006' },
  { id: 'upd-sanjay-q1-3', goalId: 'goal-sanjay-003', quarter: 'Q1', cycleId: CYCLE_ID, actualAchievement: 0, completionDate: new Date('2025-06-12'), status: PROGRESS_STATUS.COMPLETED, computedScore: 1, notes: 'Campaign launched 3 days ahead of deadline.', updatedAt: new Date('2025-07-14'), updatedBy: 'emp-sanjay-006' },
  // Sanjay Q2
  { id: 'upd-sanjay-q2-1', goalId: 'goal-sanjay-001', quarter: 'Q2', cycleId: CYCLE_ID, actualAchievement: 33, completionDate: null, status: PROGRESS_STATUS.ON_TRACK, computedScore: 33 / 35, notes: 'Tier-2 awareness climbing after regional activations.', updatedAt: new Date('2025-10-12'), updatedBy: 'emp-sanjay-006' },
  { id: 'upd-sanjay-q2-2', goalId: 'goal-sanjay-002', quarter: 'Q2', cycleId: CYCLE_ID, actualAchievement: 4.2, completionDate: null, status: PROGRESS_STATUS.COMPLETED, computedScore: 4.2 / 4, notes: 'ROAS exceeded target after festive season optimization.', updatedAt: new Date('2025-10-12'), updatedBy: 'emp-sanjay-006' },

  // Divya Q1
  { id: 'upd-divya-q1-1', goalId: 'goal-divya-001', quarter: 'Q1', cycleId: CYCLE_ID, actualAchievement: 7, completionDate: null, status: PROGRESS_STATUS.ON_TRACK, computedScore: 5 / 7, notes: 'Close cycle still above target; process gaps being addressed.', updatedAt: new Date('2025-07-16'), updatedBy: 'emp-divya-007' },
  { id: 'upd-divya-q1-2', goalId: 'goal-divya-002', quarter: 'Q1', cycleId: CYCLE_ID, actualAchievement: 8, completionDate: null, status: PROGRESS_STATUS.ON_TRACK, computedScore: 5 / 8, notes: 'Forecast variance high due to market volatility.', updatedAt: new Date('2025-07-16'), updatedBy: 'emp-divya-007' },
  // Divya Q2
  { id: 'upd-divya-q2-1', goalId: 'goal-divya-001', quarter: 'Q2', cycleId: CYCLE_ID, actualAchievement: 5.5, completionDate: null, status: PROGRESS_STATUS.ON_TRACK, computedScore: 5 / 5.5, notes: 'Close cycle improving — automation helped.', updatedAt: new Date('2025-10-18'), updatedBy: 'emp-divya-007' },
  { id: 'upd-divya-q2-2', goalId: 'goal-divya-002', quarter: 'Q2', cycleId: CYCLE_ID, actualAchievement: 6, completionDate: null, status: PROGRESS_STATUS.ON_TRACK, computedScore: 5 / 6, notes: 'Forecast accuracy improving.', updatedAt: new Date('2025-10-18'), updatedBy: 'emp-divya-007' },

  // Sneha Q1
  { id: 'upd-sneha-q1-1', goalId: 'goal-sneha-001', quarter: 'Q1', cycleId: CYCLE_ID, actualAchievement: 18, completionDate: null, status: PROGRESS_STATUS.ON_TRACK, computedScore: 15 / 18, notes: 'Payment cycle improving but not at target.', updatedAt: new Date('2025-07-19'), updatedBy: 'emp-sneha-009' },
  { id: 'upd-sneha-q1-2', goalId: 'goal-sneha-002', quarter: 'Q1', cycleId: CYCLE_ID, actualAchievement: 0, completionDate: null, status: PROGRESS_STATUS.COMPLETED, computedScore: 1, notes: 'Zero GST compliance gaps.', updatedAt: new Date('2025-07-19'), updatedBy: 'emp-sneha-009' },
  { id: 'upd-sneha-q1-3', goalId: 'goal-sneha-003', quarter: 'Q1', cycleId: CYCLE_ID, actualAchievement: 62, completionDate: null, status: PROGRESS_STATUS.ON_TRACK, computedScore: 62 / 90, notes: 'Expense automation rollout underway in 3 of 5 teams.', updatedAt: new Date('2025-07-19'), updatedBy: 'emp-sneha-009' },
  // Sneha Q2
  { id: 'upd-sneha-q2-1', goalId: 'goal-sneha-001', quarter: 'Q2', cycleId: CYCLE_ID, actualAchievement: 14, completionDate: null, status: PROGRESS_STATUS.COMPLETED, computedScore: 15 / 14, notes: 'Payment cycle now below target — great progress.', updatedAt: new Date('2025-10-20'), updatedBy: 'emp-sneha-009' },
  { id: 'upd-sneha-q2-2', goalId: 'goal-sneha-002', quarter: 'Q2', cycleId: CYCLE_ID, actualAchievement: 0, completionDate: null, status: PROGRESS_STATUS.COMPLETED, computedScore: 1, notes: 'Still zero gaps.', updatedAt: new Date('2025-10-20'), updatedBy: 'emp-sneha-009' },
  { id: 'upd-sneha-q2-3', goalId: 'goal-sneha-003', quarter: 'Q2', cycleId: CYCLE_ID, actualAchievement: 85, completionDate: null, status: PROGRESS_STATUS.ON_TRACK, computedScore: 85 / 90, notes: 'All teams onboarded; adoption at 85%.', updatedAt: new Date('2025-10-20'), updatedBy: 'emp-sneha-009' },
];

// ─── Additional Manager Check-ins ───────────────────────────────

export const EXTRA_CHECKINS: ManagerCheckin[] = [
  { id: 'checkin-sanjay-q1', managerId: 'mgr-neha-003', employeeId: 'emp-sanjay-006', quarter: 'Q1', cycleId: CYCLE_ID, comment: 'Strong campaign execution. Brand awareness in metros is excellent; discussed action plan for tier-2 city activation. ROAS trend is positive — keep optimizing creatives. Monsoon campaign launch ahead of schedule was impressive.', completedAt: new Date('2025-07-25') },
  { id: 'checkin-divya-q1', managerId: 'mgr-rohan-004', employeeId: 'emp-divya-007', quarter: 'Q1', cycleId: CYCLE_ID, comment: 'Monthly close cycle needs continued focus — still 2 days above target. Forecast accuracy concern flagged; will work with revenue team on better pipeline data. Audit findings timeline is on track. Overall satisfactory progress.', completedAt: new Date('2025-07-26') },
  { id: 'checkin-sneha-q1', managerId: 'mgr-rohan-004', employeeId: 'emp-sneha-009', quarter: 'Q1', cycleId: CYCLE_ID, comment: 'Excellent compliance record maintained. Vendor payment optimization showing improvement. Expense automation rollout is progressing well — agreed to prioritize remaining 2 teams in Q2. Keep up the proactive approach.', completedAt: new Date('2025-07-27') },
];

// ─── Additional Audit Logs ──────────────────────────────────────

export const EXTRA_AUDIT_LOGS: AuditLog[] = [
  { id: 'audit-ext-001', entityType: 'goal_sheet', entityId: 'sheet-sanjay-001', action: 'SUBMIT', fieldName: 'status', oldValue: { status: 'DRAFT' }, newValue: { status: 'PENDING_APPROVAL' }, changedBy: 'emp-sanjay-006', changedAt: new Date('2025-05-11T09:30:00'), ipAddress: '10.24.8.15', userAgent: 'Meridian Demo' },
  { id: 'audit-ext-002', entityType: 'goal_sheet', entityId: 'sheet-sanjay-001', action: 'APPROVE', fieldName: 'status', oldValue: { status: 'PENDING_APPROVAL' }, newValue: { status: 'LOCKED' }, changedBy: 'mgr-neha-003', changedAt: new Date('2025-05-14T14:20:00'), ipAddress: '10.24.8.22', userAgent: 'Meridian Demo' },
  { id: 'audit-ext-003', entityType: 'goal_sheet', entityId: 'sheet-divya-001', action: 'APPROVE', fieldName: 'status', oldValue: { status: 'PENDING_APPROVAL' }, newValue: { status: 'LOCKED' }, changedBy: 'mgr-rohan-004', changedAt: new Date('2025-05-15T11:45:00'), ipAddress: '10.24.8.30', userAgent: 'Meridian Demo' },
  { id: 'audit-ext-004', entityType: 'goal_sheet', entityId: 'sheet-sneha-001', action: 'APPROVE', fieldName: 'status', oldValue: { status: 'PENDING_APPROVAL' }, newValue: { status: 'LOCKED' }, changedBy: 'mgr-rohan-004', changedAt: new Date('2025-05-16T10:15:00'), ipAddress: '10.24.8.30', userAgent: 'Meridian Demo' },
  { id: 'audit-ext-005', entityType: 'goal_sheet', entityId: 'sheet-aditya-001', action: 'RETURN', fieldName: 'status', oldValue: { status: 'PENDING_APPROVAL' }, newValue: { status: 'RETURNED', reason: 'Weightage for cost targets needs rebalancing' }, changedBy: 'mgr-arjun-001', changedAt: new Date('2025-05-17T16:30:00'), ipAddress: '10.24.8.12', userAgent: 'Meridian Demo' },
  { id: 'audit-ext-006', entityType: 'manager_checkin', entityId: 'checkin-sanjay-q1', action: 'CHECKIN_COMPLETE', fieldName: 'Q1', oldValue: null, newValue: { employeeId: 'emp-sanjay-006', quarter: 'Q1' }, changedBy: 'mgr-neha-003', changedAt: new Date('2025-07-25T15:00:00'), ipAddress: '10.24.8.22', userAgent: 'Meridian Demo' },
  { id: 'audit-ext-007', entityType: 'manager_checkin', entityId: 'checkin-divya-q1', action: 'CHECKIN_COMPLETE', fieldName: 'Q1', oldValue: null, newValue: { employeeId: 'emp-divya-007', quarter: 'Q1' }, changedBy: 'mgr-rohan-004', changedAt: new Date('2025-07-26T11:00:00'), ipAddress: '10.24.8.30', userAgent: 'Meridian Demo' },
  { id: 'audit-ext-008', entityType: 'goal_sheet', entityId: 'sheet-ananya-001', action: 'APPROVE', fieldName: 'status', oldValue: { status: 'PENDING_APPROVAL' }, newValue: { status: 'LOCKED' }, changedBy: 'mgr-deepa-002', changedAt: new Date('2025-05-13T09:45:00'), ipAddress: '10.24.8.18', userAgent: 'Meridian Demo' },
  { id: 'audit-ext-009', entityType: 'goal_sheet', entityId: 'sheet-meera-001', action: 'APPROVE', fieldName: 'status', oldValue: { status: 'PENDING_APPROVAL' }, newValue: { status: 'LOCKED' }, changedBy: 'mgr-deepa-002', changedAt: new Date('2025-05-16T14:30:00'), ipAddress: '10.24.8.18', userAgent: 'Meridian Demo' },
  { id: 'audit-ext-010', entityType: 'goal', entityId: 'goal-sanjay-001', action: 'MANAGER_EDIT', fieldName: 'weightage', oldValue: { weightage: 30 }, newValue: { weightage: 35 }, changedBy: 'mgr-neha-003', changedAt: new Date('2025-05-13T10:20:00'), ipAddress: '10.24.8.22', userAgent: 'Meridian Demo' },
];

// ─── Additional Notifications ───────────────────────────────────

function makeNotification(id: string, type: NotificationEvent['type'], recipientId: string, title: string, message: string, deepLink: string, createdAt: Date): NotificationEvent {
  return {
    id, type, recipientId, title, message, deepLink, createdAt, readAt: null,
    teamsCardJson: {
      type: 'AdaptiveCard', version: '1.4',
      body: [
        { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium' },
        { type: 'TextBlock', text: message, wrap: true },
      ],
      actions: [{ type: 'Action.OpenUrl', title: 'Open in Meridian', url: deepLink }],
    },
  };
}

export const EXTRA_NOTIFICATIONS: NotificationEvent[] = [
  makeNotification('notif-ext-001', 'GOAL_APPROVED', 'emp-sanjay-006', 'Goals approved and locked', 'Neha Verma approved your FY 2025-26 goal sheet. Achievement capture opens in the active quarterly window.', '/goals', new Date('2025-05-14T14:21:00')),
  makeNotification('notif-ext-002', 'GOAL_APPROVED', 'emp-divya-007', 'Goals approved and locked', 'Rohan Malhotra approved your FY 2025-26 goal sheet.', '/goals', new Date('2025-05-15T11:46:00')),
  makeNotification('notif-ext-003', 'GOAL_APPROVED', 'emp-sneha-009', 'Goals approved and locked', 'Rohan Malhotra approved your FY 2025-26 goal sheet.', '/goals', new Date('2025-05-16T10:16:00')),
  makeNotification('notif-ext-004', 'GOAL_RETURNED', 'emp-aditya-010', 'Goals returned for rework', 'Arjun Mehta returned your goal sheet: Weightage for cost targets needs rebalancing.', '/goals', new Date('2025-05-17T16:31:00')),
  makeNotification('notif-ext-005', 'CHECKIN_REMINDER', 'mgr-neha-003', 'Q1 check-in reminder', 'Sanjay Patel and Karthik Sundaram have Q1 updates pending review.', '/checkins', new Date('2025-07-20T09:00:00')),
  makeNotification('notif-ext-006', 'CHECKIN_REMINDER', 'mgr-rohan-004', 'Q1 check-in reminder', 'Divya Reddy and Sneha Gupta have submitted Q1 achievement updates.', '/checkins', new Date('2025-07-20T09:00:00')),
  makeNotification('notif-ext-007', 'GOAL_APPROVED', 'emp-ananya-003', 'Goals approved and locked', 'Deepa Krishnan approved your FY 2025-26 goal sheet.', '/goals', new Date('2025-05-13T09:46:00')),
  makeNotification('notif-ext-008', 'GOAL_APPROVED', 'emp-meera-005', 'Goals approved and locked', 'Deepa Krishnan approved your FY 2025-26 goal sheet.', '/goals', new Date('2025-05-16T14:31:00')),
];
