/**
 * Meridian — Goal Policy & Business Rules Tests (BRD §2.1, §2.3, §3, §4)
 */
import { describe, it, expect } from 'vitest';
import {
  validateGoalSheetForSubmission, assertEmployeeCanEditSheet, validateApprovalRequest,
  getQuarterForDate, validateGoalSettingWindow, validateQuarterWindow,
  validateAchievementInput, validateManagerCheckinComment, isQuarterLocked,
  computeQuarterlyUpdateScore, summarizeCycleCompletion,
  pass, fail,
} from '@/server/domain/goal-policy';
import { BUSINESS_RULES, DEMO_ACCOUNTS, DEFAULT_THRUST_AREAS, DEFAULT_CYCLE_WINDOWS, type UoMType } from '@/lib/constants';

// ─── §2.1 Goal Sheet Submission Validation ───
describe('BRD §2.1 — Goal Sheet Submission Rules', () => {
  const g = (title: string, w: number) => ({ title, weightage: w });

  it('TC-064: valid 3-goal sheet (40+30+30)', () => expect(validateGoalSheetForSubmission([g('A',40),g('B',30),g('C',30)]).ok).toBe(true));
  it('TC-065: valid 1-goal sheet at 100%', () => expect(validateGoalSheetForSubmission([g('A',100)]).ok).toBe(true));
  it('TC-066: valid 4-goal (25×4)', () => expect(validateGoalSheetForSubmission([g('A',25),g('B',25),g('C',25),g('D',25)]).ok).toBe(true));
  it('TC-067: valid 8-goal max', () => { const goals = Array.from({length:8}, () => g('G', 12)); goals[0].weightage = 16; goals[1].weightage = 12; expect(goals.reduce((s,g)=>s+g.weightage,0)).toBe(100); expect(validateGoalSheetForSubmission(goals).ok).toBe(true); });
  it('TC-068: empty goals → NO_GOALS', () => { const r = validateGoalSheetForSubmission([]); expect(r.ok).toBe(false); expect(r.code).toBe('NO_GOALS'); });
  it('TC-069: 9 goals → TOO_MANY_GOALS', () => { const goals = Array.from({length:9}, (_,i) => g(`G${i}`,11)); expect(validateGoalSheetForSubmission(goals).code).toBe('TOO_MANY_GOALS'); });
  it('TC-070: goal with 5% → GOAL_WEIGHTAGE_TOO_LOW', () => { const r = validateGoalSheetForSubmission([g('A',5),g('B',95)]); expect(r.code).toBe('GOAL_WEIGHTAGE_TOO_LOW'); });
  it('TC-071: goal with 0% → TOO_LOW', () => expect(validateGoalSheetForSubmission([g('A',0),g('B',100)]).code).toBe('GOAL_WEIGHTAGE_TOO_LOW'));
  it('TC-072: min 10% boundary pass', () => expect(validateGoalSheetForSubmission([g('A',10),g('B',40),g('C',25),g('D',25)]).ok).toBe(true));
  it('TC-073: total 90% → WEIGHTAGE_TOTAL_INVALID', () => expect(validateGoalSheetForSubmission([g('A',30),g('B',30),g('C',30)]).code).toBe('WEIGHTAGE_TOTAL_INVALID'));
  it('TC-074: total 110% → error (max weight hit first)', () => expect(validateGoalSheetForSubmission([g('A',40),g('B',40),g('C',30)]).code).toBe('WEIGHTAGE_TOTAL_INVALID'));
  it('TC-075: message mentions remaining %', () => { const r = validateGoalSheetForSubmission([g('A',30),g('B',30)]); expect(r.message).toContain('40%'); });
  it('TC-076: message mentions excess %', () => { const r = validateGoalSheetForSubmission([g('A',40),g('B',40),g('C',30)]); expect(r.message).toContain('10%'); });
  it('TC-077: exactly 8 goals valid', () => { const goals = Array.from({length:8}, (_,i) => g(`G${i}`, 12)); goals[0].weightage = 16; expect(validateGoalSheetForSubmission(goals).ok).toBe(true); });
});

// ─── Sheet Editability (Locking) ───
describe('BRD §2.1 — Goal Locking', () => {
  it('TC-078: DRAFT → editable', () => expect(assertEmployeeCanEditSheet({ status: 'DRAFT' }).ok).toBe(true));
  it('TC-079: RETURNED → editable', () => expect(assertEmployeeCanEditSheet({ status: 'RETURNED' }).ok).toBe(true));
  it('TC-080: LOCKED → not editable', () => { const r = assertEmployeeCanEditSheet({ status: 'LOCKED' }); expect(r.ok).toBe(false); expect(r.code).toBe('LOCKED'); });
  it('TC-081: APPROVED → not editable', () => expect(assertEmployeeCanEditSheet({ status: 'APPROVED' }).ok).toBe(false));
  it('TC-082: PENDING_APPROVAL → not editable', () => expect(assertEmployeeCanEditSheet({ status: 'PENDING_APPROVAL' }).ok).toBe(false));
});

// ─── Approval Request ───
describe('BRD §2.1 — Manager Approval', () => {
  const validGoals = [{ title: 'A', weightage: 40 }, { title: 'B', weightage: 30 }, { title: 'C', weightage: 30 }];
  it('TC-083: pending + valid goals → OK', () => expect(validateApprovalRequest({ status: 'PENDING_APPROVAL' }, validGoals).ok).toBe(true));
  it('TC-084: DRAFT → NOT_PENDING_APPROVAL', () => expect(validateApprovalRequest({ status: 'DRAFT' }, validGoals).code).toBe('NOT_PENDING_APPROVAL'));
  it('TC-085: LOCKED → NOT_PENDING_APPROVAL', () => expect(validateApprovalRequest({ status: 'LOCKED' }, validGoals).code).toBe('NOT_PENDING_APPROVAL'));
  it('TC-086: pending but invalid goals → WEIGHTAGE error', () => expect(validateApprovalRequest({ status: 'PENDING_APPROVAL' }, [{ title: 'A', weightage: 50 }]).ok).toBe(false));
});

// ─── §2.3 Schedule / Quarter Detection ───
describe('BRD §2.3 — Check-in Schedule', () => {
  it('TC-087: July → Q1', () => expect(getQuarterForDate(new Date('2025-07-15'))).toBe('Q1'));
  it('TC-088: October → Q2', () => expect(getQuarterForDate(new Date('2025-10-15'))).toBe('Q2'));
  it('TC-089: January → Q3', () => expect(getQuarterForDate(new Date('2026-01-15'))).toBe('Q3'));
  it('TC-090: March → Q4', () => expect(getQuarterForDate(new Date('2026-03-15'))).toBe('Q4'));
  it('TC-091: April → Q4', () => expect(getQuarterForDate(new Date('2026-04-15'))).toBe('Q4'));
  it('TC-092: June → null (between)', () => expect(getQuarterForDate(new Date('2025-06-15'))).toBe(null));
  it('TC-093: May → null (goal setting)', () => expect(getQuarterForDate(new Date('2025-05-15'))).toBe(null));
  it('TC-094: goal setting window May → open', () => expect(validateGoalSettingWindow(new Date('2025-05-15')).ok).toBe(true));
  it('TC-095: goal setting June → closed', () => expect(validateGoalSettingWindow(new Date('2025-06-15')).ok).toBe(false));
  it('TC-096: Q1 window July → open', () => expect(validateQuarterWindow(new Date('2025-07-15'), 'Q1').ok).toBe(true));
  it('TC-097: Q1 window August → closed', () => expect(validateQuarterWindow(new Date('2025-08-15'), 'Q1').ok).toBe(false));
  it('TC-098: Q2 window October → open', () => expect(validateQuarterWindow(new Date('2025-10-15'), 'Q2').ok).toBe(true));
  it('TC-099: Q3 window January → open', () => expect(validateQuarterWindow(new Date('2026-01-15'), 'Q3').ok).toBe(true));
});

// ─── Achievement Input Validation ───
describe('BRD §2.2 — Achievement Input', () => {
  it('TC-100: NOT_STARTED → always OK', () => expect(validateAchievementInput({ uomType: 'NUMERIC_MIN', status: 'NOT_STARTED', actualAchievement: null, completionDate: null }).ok).toBe(true));
  it('TC-101: ON_TRACK with actual → OK', () => expect(validateAchievementInput({ uomType: 'NUMERIC_MIN', status: 'ON_TRACK', actualAchievement: 50, completionDate: null }).ok).toBe(true));
  it('TC-102: ON_TRACK no actual → ACTUAL_REQUIRED', () => expect(validateAchievementInput({ uomType: 'NUMERIC_MIN', status: 'ON_TRACK', actualAchievement: null, completionDate: null }).code).toBe('ACTUAL_REQUIRED'));
  it('TC-103: TIMELINE with date → OK', () => expect(validateAchievementInput({ uomType: 'TIMELINE', status: 'COMPLETED', actualAchievement: 0, completionDate: new Date() }).ok).toBe(true));
  it('TC-104: TIMELINE no date → ACTUAL_REQUIRED', () => expect(validateAchievementInput({ uomType: 'TIMELINE', status: 'ON_TRACK', actualAchievement: 0, completionDate: null }).code).toBe('ACTUAL_REQUIRED'));
  it('TC-105: COMPLETED with actual → OK', () => expect(validateAchievementInput({ uomType: 'PERCENTAGE_MIN', status: 'COMPLETED', actualAchievement: 95, completionDate: null }).ok).toBe(true));
  it('TC-106: NaN actual → ACTUAL_REQUIRED', () => expect(validateAchievementInput({ uomType: 'NUMERIC_MIN', status: 'ON_TRACK', actualAchievement: NaN, completionDate: null }).code).toBe('ACTUAL_REQUIRED'));
});

// ─── Manager Check-in Comment ───
describe('BRD §2.2 — Manager Check-in Comment', () => {
  it('TC-107: valid long comment → OK', () => expect(validateManagerCheckinComment('Reviewed all goals and discussed improvement plan for next quarter.').ok).toBe(true));
  it('TC-108: too short → COMMENT_TOO_SHORT', () => expect(validateManagerCheckinComment('ok').code).toBe('COMMENT_TOO_SHORT'));
  it('TC-109: empty → COMMENT_TOO_SHORT', () => expect(validateManagerCheckinComment('').code).toBe('COMMENT_TOO_SHORT'));
  it('TC-110: whitespace only → COMMENT_TOO_SHORT', () => expect(validateManagerCheckinComment('   ').code).toBe('COMMENT_TOO_SHORT'));
  it('TC-111: exact min length → OK', () => { const c = 'x'.repeat(BUSINESS_RULES.MIN_CHECKIN_COMMENT_LENGTH); expect(validateManagerCheckinComment(c).ok).toBe(true); });
});

// ─── Quarter Locking ───
describe('Quarter Lock Detection', () => {
  const checkins = [{ employeeId: 'e1', quarter: 'Q1' as const, cycleId: 'c1' }];
  it('TC-112: locked quarter → true', () => expect(isQuarterLocked(checkins, 'e1', 'Q1', 'c1')).toBe(true));
  it('TC-113: different quarter → false', () => expect(isQuarterLocked(checkins, 'e1', 'Q2', 'c1')).toBe(false));
  it('TC-114: different employee → false', () => expect(isQuarterLocked(checkins, 'e2', 'Q1', 'c1')).toBe(false));
  it('TC-115: different cycle → false', () => expect(isQuarterLocked(checkins, 'e1', 'Q1', 'c2')).toBe(false));
  it('TC-116: empty checkins → false', () => expect(isQuarterLocked([], 'e1', 'Q1', 'c1')).toBe(false));
});

// ─── §3 User Roles & Personas ───
describe('BRD §3 — User Roles & Demo Accounts', () => {
  it('TC-117: has EMPLOYEE accounts', () => expect(DEMO_ACCOUNTS.filter(a => a.role === 'EMPLOYEE').length).toBeGreaterThan(0));
  it('TC-118: has MANAGER accounts', () => expect(DEMO_ACCOUNTS.filter(a => a.role === 'MANAGER').length).toBeGreaterThan(0));
  it('TC-119: has ADMIN accounts', () => expect(DEMO_ACCOUNTS.filter(a => a.role === 'ADMIN').length).toBeGreaterThan(0));
  it('TC-120: every employee has managerId', () => { DEMO_ACCOUNTS.filter(a => a.role === 'EMPLOYEE').forEach(a => expect(a.managerId).toBeTruthy()); });
  it('TC-121: every account has id', () => { DEMO_ACCOUNTS.forEach(a => expect(a.id).toBeTruthy()); });
  it('TC-122: every account has name', () => { DEMO_ACCOUNTS.forEach(a => expect(a.name.length).toBeGreaterThan(0)); });
  it('TC-123: every account has department', () => { DEMO_ACCOUNTS.forEach(a => expect(a.department.length).toBeGreaterThan(0)); });
  it('TC-124: every account has avatarInitials', () => { DEMO_ACCOUNTS.forEach(a => expect(a.avatarInitials.length).toBeGreaterThanOrEqual(2)); });
  it('TC-125: managerId references valid account', () => { const ids = DEMO_ACCOUNTS.map(a => a.id); DEMO_ACCOUNTS.filter(a => a.managerId).forEach(a => expect(ids).toContain(a.managerId)); });
});

// ─── Business Rules Constants ───
describe('Business Rules Constants', () => {
  it('TC-126: MAX_GOALS_PER_CYCLE = 8', () => expect(BUSINESS_RULES.MAX_GOALS_PER_CYCLE).toBe(8));
  it('TC-127: MIN_WEIGHTAGE_PER_GOAL = 10', () => expect(BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL).toBe(10));
  it('TC-128: TOTAL_WEIGHTAGE = 100', () => expect(BUSINESS_RULES.TOTAL_WEIGHTAGE).toBe(100));
  it('TC-129: MAX_WEIGHTAGE_PER_GOAL defined', () => expect(BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL).toBeGreaterThan(0));
  it('TC-130: MIN_CHECKIN_COMMENT_LENGTH defined', () => expect(BUSINESS_RULES.MIN_CHECKIN_COMMENT_LENGTH).toBeGreaterThan(0));
});

// ─── Thrust Areas ───
describe('Thrust Areas Configuration', () => {
  it('TC-131: at least 5 thrust areas', () => expect(DEFAULT_THRUST_AREAS.length).toBeGreaterThanOrEqual(5));
  it('TC-132: each has name', () => { DEFAULT_THRUST_AREAS.forEach(t => expect(t.name.length).toBeGreaterThan(0)); });
  it('TC-133: each has description', () => { DEFAULT_THRUST_AREAS.forEach(t => expect(t.description.length).toBeGreaterThan(0)); });
});

// ─── Cycle Windows ───
describe('BRD §2.3 — Cycle Windows Configuration', () => {
  it('TC-134: has Goal Setting window', () => expect(DEFAULT_CYCLE_WINDOWS.find(w => w.name === 'Goal Setting')).toBeDefined());
  it('TC-135: has Q1 window', () => expect(DEFAULT_CYCLE_WINDOWS.find(w => w.quarter === 'Q1')).toBeDefined());
  it('TC-136: has Q2 window', () => expect(DEFAULT_CYCLE_WINDOWS.find(w => w.quarter === 'Q2')).toBeDefined());
  it('TC-137: has Q3 window', () => expect(DEFAULT_CYCLE_WINDOWS.find(w => w.quarter === 'Q3')).toBeDefined());
  it('TC-138: has Q4 window', () => expect(DEFAULT_CYCLE_WINDOWS.find(w => w.quarter === 'Q4')).toBeDefined());
  it('TC-139: Goal Setting opens May', () => { const w = DEFAULT_CYCLE_WINDOWS.find(w => w.name === 'Goal Setting')!; expect(new Date(w.opensAt).getMonth()).toBe(4); });
  it('TC-140: Q1 opens July', () => { const w = DEFAULT_CYCLE_WINDOWS.find(w => w.quarter === 'Q1')!; expect(new Date(w.opensAt).getMonth()).toBe(6); });
});

// ─── Compute Score ───
describe('computeQuarterlyUpdateScore', () => {
  const goal = (uomType: UoMType, target: number, targetDate?: Date) => ({ id: 'g1', sheetId: 's1', thrustAreaId: 'ta-1', title: 'T', description: null, uomType, target, targetDate: targetDate ?? null, weightage: 30, isShared: false, sharedFromId: null, isOwner: true, displayOrder: 0, createdAt: new Date(), updatedAt: new Date() });
  it('TC-141: MIN score', () => expect(computeQuarterlyUpdateScore(goal('NUMERIC_MIN', 100), 80, null)).toBe(0.8));
  it('TC-142: MAX score', () => expect(computeQuarterlyUpdateScore(goal('NUMERIC_MAX', 48), 50, null)).toBeCloseTo(48/50));
  it('TC-143: ZERO score 0→100%', () => expect(computeQuarterlyUpdateScore(goal('ZERO_BASED', 0), 0, null)).toBe(1.0));
  it('TC-144: ZERO score 1→0%', () => expect(computeQuarterlyUpdateScore(goal('ZERO_BASED', 0), 1, null)).toBe(0));
  it('TC-145: TIMELINE on time', () => expect(computeQuarterlyUpdateScore(goal('TIMELINE', 0, new Date('2025-09-30')), 0, new Date('2025-09-15'))).toBe(1.0));
});

// ─── Cycle Completion Summary ───
describe('§4 Reporting — Cycle Completion', () => {
  const emps = [{ id: 'e1', managerId: 'm1', role: 'EMPLOYEE' }, { id: 'e2', managerId: 'm1', role: 'EMPLOYEE' }];
  const sheets = [{ employeeId: 'e1', status: 'LOCKED' as const }, { employeeId: 'e2', status: 'DRAFT' as const }];
  const checkins = [{ employeeId: 'e1', quarter: 'Q1' as const }];

  it('TC-146: counts employees', () => expect(summarizeCycleCompletion(emps, sheets, checkins, 'Q1').employees).toBe(2));
  it('TC-147: submitted count', () => expect(summarizeCycleCompletion(emps, sheets, checkins, 'Q1').submitted).toBe(1));
  it('TC-148: approved count', () => expect(summarizeCycleCompletion(emps, sheets, checkins, 'Q1').approved).toBe(1));
  it('TC-149: checkins count', () => expect(summarizeCycleCompletion(emps, sheets, checkins, 'Q1').checkinsCompleted).toBe(1));
  it('TC-150: submission rate', () => expect(summarizeCycleCompletion(emps, sheets, checkins, 'Q1').submissionRate).toBe(0.5));
});

// ─── Pass/Fail helpers ───
describe('PolicyResult helpers', () => {
  it('TC-151: pass creates ok result', () => { const r = pass('test'); expect(r.ok).toBe(true); expect(r.code).toBe('OK'); });
  it('TC-152: fail creates error result', () => { const r = fail('NO_GOALS', 'msg'); expect(r.ok).toBe(false); expect(r.code).toBe('NO_GOALS'); });
});
