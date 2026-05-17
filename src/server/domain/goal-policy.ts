import { BUSINESS_RULES, DEFAULT_CYCLE_WINDOWS, type Quarter } from '@/lib/constants';
import { calculateProgressScore } from '@/lib/calculations';
import type { Goal, GoalCycle, GoalSheet, ManagerCheckin, QuarterlyUpdate } from '@/types';

export interface PolicyResult {
  ok: boolean;
  code:
    | 'OK'
    | 'NO_GOALS'
    | 'TOO_MANY_GOALS'
    | 'WEIGHTAGE_TOTAL_INVALID'
    | 'GOAL_WEIGHTAGE_TOO_LOW'
    | 'GOAL_WEIGHTAGE_TOO_HIGH'
    | 'LOCKED'
    | 'NOT_PENDING_APPROVAL'
    | 'WINDOW_CLOSED'
    | 'CHECKIN_LOCKED'
    | 'COMMENT_TOO_SHORT'
    | 'ACTUAL_REQUIRED';
  message: string;
}

export function pass(message = 'OK'): PolicyResult {
  return { ok: true, code: 'OK', message };
}

export function fail(code: PolicyResult['code'], message: string): PolicyResult {
  return { ok: false, code, message };
}

export function validateGoalSheetForSubmission(goals: Pick<Goal, 'title' | 'weightage'>[]): PolicyResult {
  if (goals.length === 0) {
    return fail('NO_GOALS', 'Create at least one goal before submitting your goal sheet.');
  }

  if (goals.length > BUSINESS_RULES.MAX_GOALS_PER_CYCLE) {
    return fail(
      'TOO_MANY_GOALS',
      `A goal sheet can contain at most ${BUSINESS_RULES.MAX_GOALS_PER_CYCLE} goals. Remove ${goals.length - BUSINESS_RULES.MAX_GOALS_PER_CYCLE} goal(s).`
    );
  }

  const lowWeightGoal = goals.find((goal) => goal.weightage < BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL);
  if (lowWeightGoal) {
    return fail(
      'GOAL_WEIGHTAGE_TOO_LOW',
      `"${lowWeightGoal.title}" has ${lowWeightGoal.weightage}% weightage. Minimum per goal is ${BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}%.`
    );
  }

  const highWeightGoal = goals.find((goal) => goal.weightage > BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL);
  if (highWeightGoal) {
    return fail(
      'GOAL_WEIGHTAGE_TOO_HIGH',
      `"${highWeightGoal.title}" has ${highWeightGoal.weightage}% weightage. Maximum per goal is ${BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL}%.`
    );
  }

  const total = goals.reduce((sum, goal) => sum + goal.weightage, 0);
  if (total !== BUSINESS_RULES.TOTAL_WEIGHTAGE) {
    const delta = BUSINESS_RULES.TOTAL_WEIGHTAGE - total;
    return fail(
      'WEIGHTAGE_TOTAL_INVALID',
      delta > 0
        ? `Your total weightage is ${total}%. Allocate the remaining ${delta}% before submitting.`
        : `Your total weightage is ${total}%. Reduce ${Math.abs(delta)}% before submitting.`
    );
  }

  return pass('Goal sheet satisfies all BRD submission rules.');
}

export function assertEmployeeCanEditSheet(sheet: Pick<GoalSheet, 'status'>): PolicyResult {
  if (sheet.status === 'LOCKED' || sheet.status === 'APPROVED' || sheet.status === 'PENDING_APPROVAL') {
    return fail('LOCKED', 'This goal sheet is not editable. Ask HR/Admin to unlock it for rework.');
  }

  return pass('Goal sheet is editable.');
}

export function validateApprovalRequest(sheet: Pick<GoalSheet, 'status'>, goals: Pick<Goal, 'title' | 'weightage'>[]): PolicyResult {
  if (sheet.status !== 'PENDING_APPROVAL') {
    return fail('NOT_PENDING_APPROVAL', 'Only goal sheets pending approval can be approved.');
  }

  return validateGoalSheetForSubmission(goals);
}

export function getQuarterForDate(date: Date): Quarter | null {
  const month = date.getMonth();
  if (month === 6) return 'Q1';
  if (month === 9) return 'Q2';
  if (month === 0) return 'Q3';
  if (month === 2 || month === 3) return 'Q4';
  return null;
}

export function validateGoalSettingWindow(date: Date): PolicyResult {
  const goalWindow = DEFAULT_CYCLE_WINDOWS.find((window) => window.name === 'Goal Setting');
  const opens = goalWindow ? new Date(goalWindow.opensAt) : null;
  const closes = goalWindow ? new Date(goalWindow.closesAt) : null;
  if (!opens || !closes || date < opens || date > closes) {
    return fail(
      'WINDOW_CLOSED',
      `Goal creation and submission are open only in May. Current demo date: ${date.toLocaleDateString('en-IN')}.`
    );
  }

  return pass('Goal setting window is open.');
}

export function validateQuarterWindow(date: Date, quarter: Quarter): PolicyResult {
  const quarterWindow = DEFAULT_CYCLE_WINDOWS.find((window) => window.quarter === quarter);
  const opens = quarterWindow ? new Date(quarterWindow.opensAt) : null;
  const closes = quarterWindow ? new Date(quarterWindow.closesAt) : null;
  if (!opens || !closes || date < opens || date > closes) {
    return fail(
      'WINDOW_CLOSED',
      `${quarter} achievement capture is closed for ${date.toLocaleDateString('en-IN')}.`
    );
  }

  return pass(`${quarter} achievement capture is open.`);
}

export function validateAchievementInput(options: {
  uomType: Goal['uomType'];
  status: QuarterlyUpdate['status'];
  actualAchievement: number | null;
  completionDate: Date | null;
}): PolicyResult {
  if (options.status === 'NOT_STARTED') return pass('Not-started goals may be saved without achievement.');

  if (options.uomType === 'TIMELINE') {
    if (!options.completionDate) {
      return fail('ACTUAL_REQUIRED', 'Timeline goals need a completion date before saving this check-in.');
    }
    return pass('Timeline achievement is complete.');
  }

  if (options.actualAchievement == null || !Number.isFinite(options.actualAchievement)) {
    return fail('ACTUAL_REQUIRED', 'Enter the actual achievement for every goal marked On Track or Completed.');
  }

  return pass('Achievement input is complete.');
}

export function validateManagerCheckinComment(comment: string): PolicyResult {
  if (comment.trim().length < BUSINESS_RULES.MIN_CHECKIN_COMMENT_LENGTH) {
    return fail(
      'COMMENT_TOO_SHORT',
      `Document the discussion with at least ${BUSINESS_RULES.MIN_CHECKIN_COMMENT_LENGTH} characters.`
    );
  }

  return pass('Check-in comment is complete.');
}

export function isQuarterLocked(
  managerCheckins: Pick<ManagerCheckin, 'employeeId' | 'quarter' | 'cycleId'>[],
  employeeId: string,
  quarter: Quarter,
  cycleId: string
): boolean {
  return managerCheckins.some(
    (checkin) => checkin.employeeId === employeeId && checkin.quarter === quarter && checkin.cycleId === cycleId
  );
}

export function computeQuarterlyUpdateScore(goal: Goal, actualAchievement: number, completionDate: Date | null): number {
  return calculateProgressScore({
    uomType: goal.uomType,
    target: goal.target,
    actual: actualAchievement,
    targetDate: goal.targetDate,
    completionDate,
  });
}

export function summarizeCycleCompletion(
  employees: Array<{ id: string; managerId: string | null; role: string }>,
  sheets: Pick<GoalSheet, 'employeeId' | 'status'>[],
  managerCheckins: Pick<ManagerCheckin, 'employeeId' | 'quarter'>[],
  quarter: Quarter
) {
  const employeeRows = employees.filter((employee) => employee.role === 'EMPLOYEE');
  const submitted = sheets.filter((sheet) => sheet.status !== 'DRAFT').length;
  const approved = sheets.filter((sheet) => sheet.status === 'LOCKED' || sheet.status === 'APPROVED').length;
  const checkins = new Set(
    managerCheckins.filter((checkin) => checkin.quarter === quarter).map((checkin) => checkin.employeeId)
  );

  return {
    employees: employeeRows.length,
    submitted,
    approved,
    checkinsCompleted: employeeRows.filter((employee) => checkins.has(employee.id)).length,
    submissionRate: employeeRows.length === 0 ? 0 : submitted / employeeRows.length,
    approvalRate: employeeRows.length === 0 ? 0 : approved / employeeRows.length,
  };
}

export function buildAchievementReportRows(
  goals: Goal[],
  updates: QuarterlyUpdate[],
  quarter: Quarter,
  cycle: GoalCycle
) {
  return goals.map((goal) => {
    const update = updates.find((candidate) => candidate.goalId === goal.id && candidate.quarter === quarter);
    const computedScore = update?.computedScore ?? null;

    return {
      cycle: cycle.name,
      quarter,
      goalId: goal.id,
      title: goal.title,
      plannedTarget: goal.uomType === 'TIMELINE' ? goal.targetDate?.toISOString().slice(0, 10) ?? '' : goal.target,
      actualAchievement: update?.completionDate?.toISOString().slice(0, 10) ?? update?.actualAchievement ?? '',
      status: update?.status ?? 'NOT_SUBMITTED',
      score: computedScore == null ? '' : Math.round(computedScore * 1000) / 10,
      weightage: goal.weightage,
    };
  });
}
