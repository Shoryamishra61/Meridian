/**
 * Meridian — TypeScript Interfaces
 * All data shapes for the application.
 * No `any` types — strict TypeScript throughout.
 */

import type { UserRole, GoalStatus, UoMType, ProgressStatus, Quarter } from '@/lib/constants';

// ─── User Types ─────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  managerId: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithTeam extends User {
  teamMembers: User[];
  manager: User | null;
}

// ─── Department Types ───────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  createdAt: Date;
}

// ─── Thrust Area Types ──────────────────────────────────────────

export interface ThrustArea {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

// ─── Cycle Types ────────────────────────────────────────────────

export interface GoalCycle {
  id: string;
  name: string;
  year: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  config: CycleConfig | null;
  createdAt: Date;
}

export interface CycleConfig {
  goalSetting: { opens: string; closes: string };
  q1: { opens: string; closes: string };
  q2: { opens: string; closes: string };
  q3: { opens: string; closes: string };
  q4: { opens: string; closes: string };
}

// ─── Goal Sheet Types ───────────────────────────────────────────

export interface GoalSheet {
  id: string;
  employeeId: string;
  cycleId: string;
  status: GoalStatus;
  submittedAt: Date | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  returnedAt: Date | null;
  returnedReason: string | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalSheetWithGoals extends GoalSheet {
  goals: Goal[];
  employee: User;
  cycle: GoalCycle;
  approver?: User | null;
}

// ─── Goal Types ─────────────────────────────────────────────────

export interface Goal {
  id: string;
  sheetId: string;
  thrustAreaId: string;
  title: string;
  description: string | null;
  uomType: UoMType;
  target: number;
  targetDate: Date | null;
  weightage: number;
  isShared: boolean;
  sharedFromId: string | null;
  isOwner: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalWithDetails extends Goal {
  thrustArea: ThrustArea;
  quarterlyUpdates: QuarterlyUpdate[];
  sheet: GoalSheet;
}

// ─── Quarterly Update Types ─────────────────────────────────────

export interface QuarterlyUpdate {
  id: string;
  goalId: string;
  quarter: Quarter;
  cycleId: string;
  actualAchievement: number | null;
  completionDate: Date | null;
  status: ProgressStatus;
  computedScore: number | null;
  notes: string | null;
  updatedAt: Date;
  updatedBy: string;
}

// ─── Manager Check-in Types ─────────────────────────────────────

export interface ManagerCheckin {
  id: string;
  managerId: string;
  employeeId: string;
  quarter: Quarter;
  cycleId: string;
  comment: string;
  completedAt: Date;
}

export interface NotificationEvent {
  id: string;
  type: 'GOAL_SUBMITTED' | 'GOAL_APPROVED' | 'GOAL_RETURNED' | 'CHECKIN_REMINDER' | 'ESCALATION';
  recipientId: string;
  title: string;
  message: string;
  deepLink: string;
  teamsCardJson: Record<string, unknown>;
  createdAt: Date;
  readAt: Date | null;
}

// ─── Audit Log Types ────────────────────────────────────────────

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  fieldName: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  changedBy: string;
  changedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  /** DJB2 chain hash for tamper evidence (links to previous entry's hash). */
  integrityHash?: string;
  // Joined
  changedByUser?: User;
}

// ─── Escalation Types ───────────────────────────────────────────

export interface EscalationRule {
  id: string;
  triggerType: 'GOAL_NOT_SUBMITTED' | 'GOAL_NOT_APPROVED' | 'CHECKIN_NOT_COMPLETED';
  daysThreshold: number;
  notifyLevel: 'EMPLOYEE' | 'MANAGER' | 'HR';
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface EscalationEvent {
  id: string;
  ruleId: string;
  targetUserId: string;
  notifiedUserId: string;
  level: string;
  triggeredAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  // Joined
  targetUser?: User;
  notifiedUser?: User;
  rule?: EscalationRule;
}

// ─── Analytics Types ────────────────────────────────────────────

export interface QoQTrendData {
  quarter: string;
  teamAvg: number;
  orgAvg: number;
  individual?: number;
}

export interface HeatmapCell {
  employeeId: string;
  employeeName: string;
  quarter: Quarter;
  status: 'completed' | 'pending' | 'overdue' | 'not_due';
}

export interface GoalDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface ManagerEffectiveness {
  managerId: string;
  managerName: string;
  teamSize: number;
  checkinCompletionRate: number;
  avgDaysToApprove: number;
  escalationCount: number;
}

// ─── Dashboard Summary Types ────────────────────────────────────

export interface EmployeeDashboard {
  user: User;
  activeCycle: GoalCycle | null;
  activeSheet: GoalSheetWithGoals | null;
  currentWindow: string;
  daysRemaining: number;
  recentActivity: ActivityItem[];
}

export interface ManagerDashboard {
  user: User;
  teamMembers: TeamMemberSummary[];
  pendingApprovals: number;
  checkinsPending: number;
}

export interface AdminDashboard {
  totalEmployees: number;
  goalsSubmitted: number;
  goalsApproved: number;
  pendingApprovals: number;
  departmentStats: DepartmentStat[];
}

export interface TeamMemberSummary {
  employee: User;
  sheetStatus: GoalStatus | 'NO_SHEET';
  goalCount: number;
  totalWeightage: number;
  overallScore: number | null;
}

export interface DepartmentStat {
  department: string;
  totalEmployees: number;
  submitted: number;
  approved: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
}
