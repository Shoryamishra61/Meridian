/**
 * Meridian — Core Constants & Configuration
 * All magic numbers, enums, and cycle configuration live here.
 */

// ─── ENUMS (matching DB schema) ─────────────────────────────────

export const USER_ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const GOAL_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  LOCKED: 'LOCKED',
  RETURNED: 'RETURNED',
} as const;

export type GoalStatus = (typeof GOAL_STATUS)[keyof typeof GOAL_STATUS];

export const UOM_TYPES = {
  NUMERIC_MIN: 'NUMERIC_MIN',   // Higher is better — e.g., Sales Revenue
  NUMERIC_MAX: 'NUMERIC_MAX',   // Lower is better — e.g., TAT, Cost
  PERCENTAGE_MIN: 'PERCENTAGE_MIN', // Higher percentage is better
  PERCENTAGE_MAX: 'PERCENTAGE_MAX', // Lower percentage is better
  TIMELINE: 'TIMELINE',         // Date-based completion
  ZERO_BASED: 'ZERO_BASED',     // Zero = Success — e.g., Safety incidents
} as const;

export type UoMType = (typeof UOM_TYPES)[keyof typeof UOM_TYPES];

export const UOM_LABELS: Record<UoMType, string> = {
  NUMERIC_MIN: 'Numeric (Min — Higher is Better)',
  NUMERIC_MAX: 'Numeric (Max — Lower is Better)',
  PERCENTAGE_MIN: 'Percentage (Min — Higher is Better)',
  PERCENTAGE_MAX: 'Percentage (Max — Lower is Better)',
  TIMELINE: 'Timeline (Date-Based)',
  ZERO_BASED: 'Zero-Based (Zero = Success)',
};

export const UOM_DESCRIPTIONS: Record<UoMType, string> = {
  NUMERIC_MIN: 'Achievement ÷ Target — e.g., Revenue, Sales count',
  NUMERIC_MAX: 'Target ÷ Achievement — e.g., TAT, Cost reduction',
  PERCENTAGE_MIN: 'Achievement ÷ Target — e.g., CSAT, conversion rate',
  PERCENTAGE_MAX: 'Target ÷ Achievement — e.g., defect rate, churn rate',
  TIMELINE: 'Complete by deadline — Completion date vs. Deadline',
  ZERO_BASED: 'Zero incidents = 100% — e.g., Safety, Compliance',
};

export const PROGRESS_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  ON_TRACK: 'ON_TRACK',
  COMPLETED: 'COMPLETED',
} as const;

export type ProgressStatus = (typeof PROGRESS_STATUS)[keyof typeof PROGRESS_STATUS];

export const QUARTERS = {
  Q1: 'Q1',
  Q2: 'Q2',
  Q3: 'Q3',
  Q4: 'Q4',
} as const;

export type Quarter = (typeof QUARTERS)[keyof typeof QUARTERS];

// ─── BUSINESS RULES (BRD-mandated) ─────────────────────────────

export const BUSINESS_RULES = {
  /** Total weightage across all goals must equal 100% */
  TOTAL_WEIGHTAGE: 100,
  /** Minimum weightage per individual goal */
  MIN_WEIGHTAGE_PER_GOAL: 10,
  /** Maximum weightage per individual goal */
  MAX_WEIGHTAGE_PER_GOAL: 100,
  /** Maximum number of goals per employee per cycle */
  MAX_GOALS_PER_CYCLE: 8,
  /** Maximum character length for goal title */
  MAX_TITLE_LENGTH: 200,
  /** Maximum character length for goal description */
  MAX_DESCRIPTION_LENGTH: 1000,
  /** Minimum character length for manager check-in comment */
  MIN_CHECKIN_COMMENT_LENGTH: 50,
} as const;

// ─── CYCLE CONFIGURATION ────────────────────────────────────────

export interface CycleWindowConfig {
  name: string;
  quarter?: Quarter;
  opensAt: string; // ISO date string
  closesAt: string;
  action: string;
}

/**
 * Default cycle windows for FY 2025-26
 * Can be overridden by Admin via the configuration panel
 */
export const DEFAULT_CYCLE_WINDOWS: CycleWindowConfig[] = [
  {
    name: 'Goal Setting',
    opensAt: '2025-05-01',
    closesAt: '2025-05-31',
    action: 'Goal Creation, Submission & Approval',
  },
  {
    name: 'Q1 Check-in',
    quarter: 'Q1',
    opensAt: '2025-07-01',
    closesAt: '2025-07-31',
    action: 'Progress Update — Planned vs. Actual',
  },
  {
    name: 'Q2 Check-in',
    quarter: 'Q2',
    opensAt: '2025-10-01',
    closesAt: '2025-10-31',
    action: 'Progress Update — Planned vs. Actual',
  },
  {
    name: 'Q3 Check-in',
    quarter: 'Q3',
    opensAt: '2026-01-01',
    closesAt: '2026-01-31',
    action: 'Progress Update — Planned vs. Actual',
  },
  {
    name: 'Q4 / Annual',
    quarter: 'Q4',
    opensAt: '2026-03-01',
    closesAt: '2026-04-30',
    action: 'Final Achievement Capture',
  },
];

/** Normalize a date to UTC midnight for timezone-safe range comparison. */
function toUTCMidnight(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Resolve the active check-in quarter for a given date by consulting the
 * canonical `DEFAULT_CYCLE_WINDOWS` table. This is the single source of truth
 * shared with `validateQuarterWindow` (in goal-policy.ts) and prevents UI/
 * server logic from drifting apart.
 */
export function getCheckinQuarterForDate(date: Date): Quarter | null {
  const d = toUTCMidnight(date);
  for (const window of DEFAULT_CYCLE_WINDOWS) {
    if (!window.quarter) continue;
    const opens = toUTCMidnight(new Date(window.opensAt));
    const closes = toUTCMidnight(new Date(window.closesAt));
    if (d >= opens && d <= closes) return window.quarter;
  }
  return null;
}

/** Returns true when the given date falls inside the goal-setting window. */
export function isGoalSettingWindowOpen(date: Date): boolean {
  const goalWindow = DEFAULT_CYCLE_WINDOWS.find((window) => window.name === 'Goal Setting');
  if (!goalWindow) return false;
  const d = toUTCMidnight(date);
  const opens = toUTCMidnight(new Date(goalWindow.opensAt));
  const closes = toUTCMidnight(new Date(goalWindow.closesAt));
  return d >= opens && d <= closes;
}

export function getWindowMessageForDate(date: Date): string {
  const quarter = getCheckinQuarterForDate(date);
  if (quarter) return `${quarter} check-in window is open`;
  if (isGoalSettingWindowOpen(date)) return 'Goal setting window is open';
  return 'No achievement capture window is open for this demo date';
}

/**
 * Human-friendly countdown to the next upcoming cycle window, derived from
 * `DEFAULT_CYCLE_WINDOWS`. Returns a localized sentence appropriate for any
 * year (no hard-coded FY).
 */
export function getNextWindowCountdown(date: Date): string {
  const now = toUTCMidnight(date);
  const upcoming = DEFAULT_CYCLE_WINDOWS
    .map((window) => ({ window, opens: toUTCMidnight(new Date(window.opensAt)) }))
    .filter((entry) => entry.opens > now)
    .sort((a, b) => a.opens - b.opens);

  if (upcoming.length === 0) return 'Next cycle opens in May.';

  const next = upcoming[0];
  const days = Math.max(1, Math.ceil((next.opens - now) / 86_400_000));
  const label = next.window.quarter ?? next.window.name;
  return `${label} opens in ${days} day${days === 1 ? '' : 's'}.`;
}

// ─── THRUST AREAS (default, configurable by Admin) ──────────────

export const DEFAULT_THRUST_AREAS = [
  { name: 'Revenue Growth', description: 'Revenue targets, sales KPIs, market expansion' },
  { name: 'Operational Excellence', description: 'Process improvement, TAT reduction, quality metrics' },
  { name: 'Customer Centricity', description: 'NPS, CSAT, customer retention, service quality' },
  { name: 'People & Culture', description: 'Team development, engagement, learning initiatives' },
  { name: 'Innovation & Technology', description: 'New product development, tech adoption, R&D' },
  { name: 'Cost Optimization', description: 'Expense reduction, efficiency improvement, procurement' },
  { name: 'Compliance & Risk', description: 'Regulatory adherence, audit readiness, safety standards' },
] as const;

// ─── STATUS COLORS & LABELS ─────────────────────────────────────

export const STATUS_CONFIG: Record<GoalStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    icon: '○',
  },
  PENDING_APPROVAL: {
    label: 'Pending L1 Approval',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    icon: '⏳',
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    icon: '✓',
  },
  LOCKED: {
    label: 'Locked',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    icon: '🔒',
  },
  RETURNED: {
    label: 'Returned',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    icon: '↩',
  },
};

export const PROGRESS_STATUS_CONFIG: Record<ProgressStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  NOT_STARTED: {
    label: 'Not Started',
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
  },
  ON_TRACK: {
    label: 'On Track',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-[var(--brand)]',
    bgColor: 'bg-[var(--brand-muted)]',
  },
};

// ─── DEMO MODE ──────────────────────────────────────────────────

export const DEMO_ACCOUNTS = [
  // ── Employees (10) ─────────────────────────────────────────────
  {
    id: 'emp-priya-001',
    email: 'priya@meridian.app',
    name: 'Priya Nair',
    role: USER_ROLES.EMPLOYEE,
    department: 'Sales & BD',
    managerId: 'mgr-arjun-001',
    avatarInitials: 'PN',
  },
  {
    id: 'emp-rahul-002',
    email: 'rahul@meridian.app',
    name: 'Rahul Sharma',
    role: USER_ROLES.EMPLOYEE,
    department: 'Technology',
    managerId: 'mgr-arjun-001',
    avatarInitials: 'RS',
  },
  {
    id: 'emp-ananya-003',
    email: 'ananya@meridian.app',
    name: 'Ananya Iyer',
    role: USER_ROLES.EMPLOYEE,
    department: 'Operations',
    managerId: 'mgr-deepa-002',
    avatarInitials: 'AI',
  },
  {
    id: 'emp-vikram-004',
    email: 'vikram@meridian.app',
    name: 'Vikram Rao',
    role: USER_ROLES.EMPLOYEE,
    department: 'Technology',
    managerId: 'mgr-arjun-001',
    avatarInitials: 'VR',
  },
  {
    id: 'emp-meera-005',
    email: 'meera@meridian.app',
    name: 'Meera Kapoor',
    role: USER_ROLES.EMPLOYEE,
    department: 'Operations',
    managerId: 'mgr-deepa-002',
    avatarInitials: 'MK',
  },
  {
    id: 'emp-sanjay-006',
    email: 'sanjay@meridian.app',
    name: 'Sanjay Patel',
    role: USER_ROLES.EMPLOYEE,
    department: 'Marketing',
    managerId: 'mgr-neha-003',
    avatarInitials: 'SP',
  },
  {
    id: 'emp-divya-007',
    email: 'divya@meridian.app',
    name: 'Divya Reddy',
    role: USER_ROLES.EMPLOYEE,
    department: 'Finance',
    managerId: 'mgr-rohan-004',
    avatarInitials: 'DR',
  },
  {
    id: 'emp-karthik-008',
    email: 'karthik@meridian.app',
    name: 'Karthik Sundaram',
    role: USER_ROLES.EMPLOYEE,
    department: 'Marketing',
    managerId: 'mgr-neha-003',
    avatarInitials: 'KS',
  },
  {
    id: 'emp-sneha-009',
    email: 'sneha@meridian.app',
    name: 'Sneha Gupta',
    role: USER_ROLES.EMPLOYEE,
    department: 'Finance',
    managerId: 'mgr-rohan-004',
    avatarInitials: 'SG',
  },
  {
    id: 'emp-aditya-010',
    email: 'aditya@meridian.app',
    name: 'Aditya Joshi',
    role: USER_ROLES.EMPLOYEE,
    department: 'Sales & BD',
    managerId: 'mgr-arjun-001',
    avatarInitials: 'AJ',
  },
  // ── Managers (4) ───────────────────────────────────────────────
  {
    id: 'mgr-arjun-001',
    email: 'arjun@meridian.app',
    name: 'Arjun Mehta',
    role: USER_ROLES.MANAGER,
    department: 'Sales & BD',
    managerId: 'admin-kavya-001',
    avatarInitials: 'AM',
  },
  {
    id: 'mgr-deepa-002',
    email: 'deepa@meridian.app',
    name: 'Deepa Krishnan',
    role: USER_ROLES.MANAGER,
    department: 'Operations',
    managerId: 'admin-kavya-001',
    avatarInitials: 'DK',
  },
  {
    id: 'mgr-neha-003',
    email: 'neha@meridian.app',
    name: 'Neha Verma',
    role: USER_ROLES.MANAGER,
    department: 'Marketing',
    managerId: 'admin-kavya-001',
    avatarInitials: 'NV',
  },
  {
    id: 'mgr-rohan-004',
    email: 'rohan@meridian.app',
    name: 'Rohan Malhotra',
    role: USER_ROLES.MANAGER,
    department: 'Finance',
    managerId: 'admin-ravi-002',
    avatarInitials: 'RM',
  },
  // ── Admins (2) ─────────────────────────────────────────────────
  {
    id: 'admin-kavya-001',
    email: 'kavya@meridian.app',
    name: 'Kavya Deshmukh',
    role: USER_ROLES.ADMIN,
    department: 'HR & Admin',
    managerId: null,
    avatarInitials: 'KD',
  },
  {
    id: 'admin-ravi-002',
    email: 'ravi@meridian.app',
    name: 'Ravi Shankar',
    role: USER_ROLES.ADMIN,
    department: 'HR & Admin',
    managerId: null,
    avatarInitials: 'RŚ',
  },
] as const;

export const DEMO_PASSWORD = 'Demo@2024';
