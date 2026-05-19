/**
 * Meridian — Dashboard
 * Spacious, premium enterprise dashboard.
 * Cards with visible depth. Large stat numbers. Clear visual hierarchy.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useDemoDateStore } from '@/stores/demo-date-store';
import { BUSINESS_RULES, DEMO_ACCOUNTS, QUARTERS, STATUS_CONFIG, type Quarter } from '@/lib/constants';
import { formatScore, getScoreColor } from '@/lib/calculations';
import { cn, formatDate } from '@/lib/utils';
import { Target, CheckCircle2, Clock, AlertCircle, ArrowRight, FileText, PlugZap, Shield, Users } from 'lucide-react';
import GamificationBadges from '@/components/ui/GamificationBadges';
import CycleWindowsCard from '@/components/ui/CycleWindowsCard';
import GoalCompletionRing from '@/components/ui/GoalCompletionRing';
import CheckinCompletionRing from '@/components/analytics/CheckinCompletionRing';
import CheckinTimeline from '@/components/analytics/CheckinTimeline';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)!;

  if (user.role === 'EMPLOYEE') return <EmployeeDashboard />;
  if (user.role === 'MANAGER') return <ManagerDashboard />;
  return <AdminDashboard />;
}

// ─── Employee Dashboard ────────────────────────────────────────

function EmployeeDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const router = useRouter();
  const { goals, cycles, quarterlyUpdates, getOrCreateSheet } = useDataStore();
  const getCurrentDate = useDemoDateStore((s) => s.getCurrentDate);

  const activeCycle = cycles.find((c) => c.isActive);
  const sheet = activeCycle ? getOrCreateSheet(user.id, activeCycle.id) : null;
  const myGoals = sheet
    ? goals.filter((g) => g.sheetId === sheet.id).sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  const totalWeightage = myGoals.reduce((sum, g) => sum + g.weightage, 0);
  const currentDate = getCurrentDate();
  const sheetStatus = sheet ? (STATUS_CONFIG[sheet.status as keyof typeof STATUS_CONFIG]?.label || sheet.status) : 'Not Created';
  const remainingWeightage = BUSINESS_RULES.TOTAL_WEIGHTAGE - totalWeightage;

  const completionItems = [
    { label: 'Create 1-8 goals', done: myGoals.length > 0 && myGoals.length <= BUSINESS_RULES.MAX_GOALS_PER_CYCLE },
    { label: 'Each goal at least 10%', done: myGoals.length > 0 && myGoals.every((g) => g.weightage >= BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL) },
    { label: 'Total weightage equals 100%', done: totalWeightage === BUSINESS_RULES.TOTAL_WEIGHTAGE },
    { label: 'Submit for manager approval', done: sheet?.status === 'PENDING_APPROVAL' || sheet?.status === 'LOCKED' || sheet?.status === 'APPROVED' },
    { label: 'Goal type selected', done: myGoals.length > 0 && myGoals.every((g) => Boolean(g.thrustAreaId)) },
  ];

  const q1Updates = myGoals
    .map((goal) => ({ goal, update: quarterlyUpdates.find((u) => u.goalId === goal.id && u.quarter === 'Q1') }))
    .filter((row) => row.update?.computedScore != null);

  const statusBadgeClass =
    sheet?.status === 'PENDING_APPROVAL' ? 'badge badge-pending' :
      sheet?.status === 'LOCKED' ? 'badge badge-approved' :
        sheet?.status === 'RETURNED' ? 'badge badge-returned' :
          'badge badge-draft';

  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ═══ Page Header ═══ */}
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">Employee workspace</p>
          <h1 style={{ margin: '0 0 6px 0' }}>{user.name}</h1>
          <p className="app-page-meta">
            <span>{activeCycle?.name} cycle</span>
            <span className="sep">·</span>
            <span>{formatDate(currentDate)}</span>
            <span className="sep">·</span>
            <span className={statusBadgeClass}>{sheetStatus}</span>
          </p>
        </div>
        <div className="app-page-actions">
          <button
            onClick={() => router.push(myGoals.length === 0 ? '/goals?action=new' : '/goals')}
            className="btn-primary"
          >
            {myGoals.length === 0 ? 'Create goal sheet' : 'Open goal sheet'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ═══ Stat Cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: '16px' }}>
        <StatCard
          label="Goals Drafted"
          value={`${myGoals.length}/${BUSINESS_RULES.MAX_GOALS_PER_CYCLE}`}
          icon={Target}
        />
        <StatCard
          label="Weightage Total"
          value={`${totalWeightage}%`}
          icon={CheckCircle2}
          tone={totalWeightage === 100 ? 'success' : totalWeightage > 100 ? 'danger' : undefined}
        />
        <StatCard
          label="Remaining"
          value={`${remainingWeightage > 0 ? remainingWeightage : 0}%`}
          icon={Clock}
          tone={remainingWeightage === 0 ? 'success' : 'warning'}
        />
        <StatCard
          label="Manager State"
          value={sheetStatus}
          icon={AlertCircle}
          isBadge
          badgeClass={statusBadgeClass}
        />
      </div>

      {/* ═══ Goal sheet ═══ */}
      <div className="card overflow-hidden">
            <div className="app-section-header">
              <div className="title">
                <h2>Goal sheet</h2>
                <p>Draft, validate, and submit goals for L1 approval.</p>
              </div>
              <div className="actions">
                <span className={statusBadgeClass}>{sheetStatus}</span>
              </div>
            </div>

            {myGoals.length === 0 ? (
              <div
                style={{
                  minHeight: '224px',
                  padding: '32px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-light)] flex items-center justify-center" style={{ marginBottom: '14px' }}>
                  <Target className="w-6 h-6 text-[var(--brand)]" />
                </div>
                <h3 className="text-base font-semibold" style={{ marginBottom: '6px' }}>No goals drafted yet</h3>
                <p className="text-[13px] text-[var(--text-secondary)] max-w-[44ch] mx-auto leading-relaxed" style={{ marginBottom: '18px' }}>
                  Create measurable goals tied to Revenue, Cost, or Quality and allocate exactly 100% weightage.
                </p>
                <button onClick={() => router.push('/goals?action=new')} className="btn-primary">
                  + Add First Goal
                </button>
              </div>
            ) : (
              <div className="app-table-scroll">
                <table className="app-table" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '52px' }} />
                    <col />
                    <col style={{ width: '150px' }} />
                    <col style={{ width: '96px' }} />
                    <col style={{ width: '100px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center' }}>#</th>
                      <th>Goal</th>
                      <th>Measure</th>
                      <th style={{ textAlign: 'right' }}>Target</th>
                      <th style={{ textAlign: 'right' }}>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myGoals.map((goal, i) => (
                      <tr
                        key={goal.id}
                        onClick={() => router.push('/goals')}
                        className="hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors"
                      >
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'var(--bg-muted)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                        </td>
                        <td>
                          <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{goal.title}</p>
                          <p className="text-[12px] text-[var(--text-secondary)] truncate mt-0.5">{goal.description || 'No description'}</p>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', maxWidth: '100%', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-muted)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {goal.uomType.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{goal.target}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{goal.weightage}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </div>

      {/* ═══ Insights row (below goal sheet — not a cramped side rail) ═══ */}
      <div className="dashboard-insights-grid">
          <div className="card dashboard-support-card">
            <h2 style={{ marginBottom: '14px', fontSize: '16px', lineHeight: 1.25 }}>Submission Checklist</h2>
            <div className="app-checklist">
              {completionItems.map((item) => (
                <div key={item.label} className={cn('app-checklist-item', item.done && 'done')}>
                  <span className="app-checklist-bullet">{item.done ? '✓' : ''}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Q1 Progress */}
          {q1Updates.length > 0 && (
            <div className="card dashboard-support-card">
              <h2 style={{ marginBottom: '14px', fontSize: '16px', lineHeight: 1.25 }}>Q1 Progress</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {q1Updates.slice(0, 6).map(({ goal, update }) => {
                  const score = update?.computedScore ?? 0;
                  return (
                    <div
                      key={goal.id}
                      className="rounded-[4px] border border-[var(--border)] p-3"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-[13px] font-semibold leading-snug text-[var(--text-primary)] line-clamp-2 min-w-0" title={goal.title}>
                          {goal.title}
                        </p>
                        <p className={cn('text-[14px] font-bold tabular-nums shrink-0', getScoreColor(score))}>
                          {formatScore(score)}
                        </p>
                      </div>
                      <div className="h-1.5 w-full rounded-[2px] bg-[var(--bg-wash)] overflow-hidden">
                        <div 
                          className={cn('h-full rounded-[2px]', score >= 0.8 ? 'bg-[var(--success)]' : score >= 0.5 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]')}
                          style={{ width: `${Math.min(100, Math.max(0, score * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <GamificationBadges />
      </div>

      {/* Only show the bottom rail once the employee has goals — avoids large
          empty cards on first-load when there is nothing meaningful to chart. */}
      {myGoals.length > 0 ? (
        <div className="dashboard-secondary-grid">
          <GoalCompletionRing />
          <CycleWindowsCard currentDate={currentDate} compact />
          <NotificationPanel compact />
        </div>
      ) : (
        <div className="dashboard-secondary-grid dashboard-secondary-grid--two">
          <CycleWindowsCard currentDate={currentDate} compact />
          <NotificationPanel compact />
        </div>
      )}
    </div>
  );
}

// ─── Stat Card Component ───────────────────────────────────────

function StatCard({ label, value, icon: Icon, tone, isBadge, badgeClass }: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: 'success' | 'warning' | 'danger';
  isBadge?: boolean;
  badgeClass?: string;
}) {
  const toneMap = {
    success: 'text-[var(--success)]',
    warning: 'text-[var(--warning)]',
    danger: 'text-[var(--danger)]',
  };

  return (
    <div className="card-hover flex flex-col justify-between" style={{ padding: '18px', minHeight: '112px' }}>
      <div className="flex items-start justify-between" style={{ marginBottom: '12px' }}>
        <p className="label-sm text-[12px]">{label}</p>
        <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--bg-wash)] flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px] text-[var(--brand)]" />
        </div>
      </div>
      <div>
        {isBadge ? (
          <span className={badgeClass}>{value}</span>
        ) : (
          <p className={cn('text-2xl font-extrabold tabular-nums tracking-tight', tone && toneMap[tone])}>{value}</p>
        )}
      </div>
    </div>
  );
}

// ─── Manager Dashboard ─────────────────────────────────────────

function ManagerDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const router = useRouter();
  const { goalSheets, goals, cycles, managerCheckins } = useDataStore();

  const activeCycle = cycles.find((c) => c.isActive);
  const teamMembers = DEMO_ACCOUNTS.filter((a) => a.managerId === user.id);
  const teamMemberIds = new Set<string>(teamMembers.map((m) => m.id));
  const teamSheets = goalSheets.filter((s) => teamMembers.some((m) => m.id === s.employeeId));
  // Scope check-ins to this manager's direct reports only — prevents data leak across managers.
  const teamCheckins = managerCheckins.filter(
    (c) => c.managerId === user.id && teamMemberIds.has(c.employeeId)
  );

  const pendingApproval = teamSheets.filter((s) => s.status === 'PENDING_APPROVAL');
  const approved = teamSheets.filter((s) => s.status === 'LOCKED');
  const notStarted = teamMembers.length - teamSheets.length;

  const mgrStats = [
    { label: 'Team Size', value: teamMembers.length, hint: 'Direct reports', color: 'var(--brand)', bg: 'color-mix(in srgb, var(--brand) 18%, transparent)' },
    { label: 'Pending Approval', value: pendingApproval.length, hint: 'Needs review', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 18%, transparent)' },
    { label: 'Approved', value: approved.length, hint: 'Locked sheets', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 18%, transparent)' },
    { label: 'Not Started', value: notStarted, hint: 'No sheet yet', color: 'var(--text-secondary)', bg: 'var(--bg-muted)' },
  ];

  const statusBadgeClass = (status: string) =>
    status === 'PENDING_APPROVAL' ? 'badge badge-pending' :
      status === 'LOCKED' ? 'badge badge-approved' :
        status === 'RETURNED' ? 'badge badge-returned' :
          'badge badge-draft';

  const badgeLabel = (s: string) =>
    s === 'PENDING_APPROVAL' ? 'Pending' : s === 'LOCKED' ? 'Approved' : s === 'DRAFT' ? 'Draft' : s === 'RETURNED' ? 'Returned' : 'Not Started';

  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">Manager workspace</p>
          <h1 style={{ margin: '0 0 6px 0' }}>Team Overview</h1>
          <p className="app-page-meta">
            <span>{activeCycle?.name}</span>
            <span className="sep">·</span>
            <span>{teamMembers.length} direct reports</span>
          </p>
        </div>
        <div className="app-page-actions">
          <button onClick={() => router.push('/team')} className="btn-primary">
            Open team goals
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: '16px' }}>
        {mgrStats.map((s) => (
          <div key={s.label} className="card-hover" style={{ padding: '18px', minHeight: '112px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 650, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
              </div>
            </div>
            <div>
              <span style={{ fontSize: '24px', fontWeight: 650, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 }}>{s.value}</span>
              <p className="text-[12px] text-[var(--text-secondary)]" style={{ marginTop: '6px' }}>{s.hint}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending action banner */}
      {pendingApproval.length > 0 && (
        <div
          className="rounded-[var(--radius-md)]"
          style={{
            background: 'color-mix(in srgb, var(--warning) 14%, var(--bg-surface) 86%)',
            border: '1px solid color-mix(in srgb, var(--warning) 38%, var(--border) 62%)',
            padding: '12px 14px',
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--warning-bg)] text-[15px]">
                ⏳
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold" style={{ color: 'var(--warning)' }}>
                  {pendingApproval.length} goal {pendingApproval.length === 1 ? 'sheet needs' : 'sheets need'} your review
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                  Start with pending sheets in Team Goals.
                </p>
              </div>
            </div>
            <button onClick={() => router.push('/team')} className="btn-primary btn-sm">
              Review Goals <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Team table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Team Members</h2>
            <p className="text-[13px] text-[var(--text-secondary)]" style={{ marginTop: '4px' }}>Review goal sheets, approval state, and team completion at a glance.</p>
          </div>
          <button onClick={() => router.push('/team')} className="btn-secondary btn-sm">
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="app-table-scroll">
          <table className="app-table" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col />
              <col style={{ width: '22%' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '160px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th style={{ textAlign: 'center' }}>Goals</th>
                <th style={{ textAlign: 'right' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => {
                const memberSheet = teamSheets.find((s) => s.employeeId === member.id);
                const memberGoals = memberSheet ? goals.filter((g) => g.sheetId === memberSheet.id) : [];
                const status = memberSheet?.status || 'NOT_STARTED';
                return (
                  <tr key={member.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'color-mix(in srgb, var(--brand) 18%, transparent)', color: 'var(--brand)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {member.avatarInitials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{member.name}</p>
                          <p className="text-[12px] text-[var(--text-secondary)] truncate" style={{ marginTop: '2px' }}>{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.department}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="inline-flex h-7 min-w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-muted)] px-2 text-[12px] font-semibold tabular-nums text-[var(--text-primary)]">
                        {memberGoals.length}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={statusBadgeClass(status)}>{badgeLabel(status)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => router.push('/team')}
                        className={cn('btn-link', status !== 'PENDING_APPROVAL' && 'btn-link-muted')}
                      >
                        {status === 'PENDING_APPROVAL' ? 'Review' : 'Open'}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Check-in completion ring + recent activity timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '16px' }}>
        <div className="lg:col-span-2">
          <CheckinCompletionRing
            teamSize={teamMembers.length}
            checkins={teamCheckins}
            cycleId={activeCycle?.id}
            subtitle={`Check-ins logged for direct reports · ${activeCycle?.name ?? 'Active cycle'}`}
          />
        </div>
        <CheckinTimeline employees={teamMembers} checkins={teamCheckins} limit={6} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '16px' }}>
        <div className="card" style={{ padding: '18px' }}>
          <p className="label-sm text-[12px]" style={{ marginBottom: '10px' }}>Approval Queue</p>
          <p className="text-[22px] font-bold tabular-nums text-[var(--warning)]">{pendingApproval.length}</p>
          <p className="text-[13px] text-[var(--text-secondary)]" style={{ marginTop: '6px' }}>Sheets waiting for manager decision.</p>
        </div>
        <div className="card" style={{ padding: '18px' }}>
          <p className="label-sm text-[12px]" style={{ marginBottom: '10px' }}>Completion</p>
          <p className="text-[22px] font-bold tabular-nums text-[var(--success)]">{teamMembers.length ? Math.round((approved.length / teamMembers.length) * 100) : 0}%</p>
          <p className="text-[13px] text-[var(--text-secondary)]" style={{ marginTop: '6px' }}>Direct reports with approved goal sheets.</p>
        </div>
        <div className="card" style={{ padding: '18px' }}>
          <p className="label-sm text-[12px]" style={{ marginBottom: '10px' }}>Next Step</p>
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">{pendingApproval.length > 0 ? 'Review pending approvals' : 'Monitor check-ins'}</p>
          <p className="text-[13px] text-[var(--text-secondary)]" style={{ marginTop: '6px' }}>{pendingApproval.length > 0 ? 'Start with sheets marked Pending Review.' : 'No approval bottlenecks right now.'}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ───────────────────────────────────────────

function AdminDashboard() {
  const router = useRouter();
  const { goalSheets, cycles, auditLogs, goals, quarterlyUpdates, managerCheckins } = useDataStore();
  const getCurrentDate = useDemoDateStore((s) => s.getCurrentDate);

  const activeCycle = cycles.find((c) => c.isActive);
  const allEmployees = DEMO_ACCOUNTS.filter((a) => a.role === 'EMPLOYEE');

  const submitted = goalSheets.filter((s) => s.status !== 'DRAFT').length;
  const approved = goalSheets.filter((s) => s.status === 'LOCKED').length;
  const pending = goalSheets.filter((s) => s.status === 'PENDING_APPROVAL').length;
  const pct = allEmployees.length ? Math.round((approved / allEmployees.length) * 100) : 0;
  const quarterList = Object.values(QUARTERS) as Quarter[];
  const completionRows = quarterList.map((quarter) => {
    const employeesWithApprovedGoals = allEmployees.filter((employee) => {
      const sheet = goalSheets.find(
        (candidate) =>
          candidate.employeeId === employee.id &&
          candidate.cycleId === activeCycle?.id &&
          (candidate.status === 'LOCKED' || candidate.status === 'APPROVED')
      );
      return sheet && goals.some((goal) => goal.sheetId === sheet.id);
    });
    const achievementComplete = employeesWithApprovedGoals.filter((employee) => {
      const sheet = goalSheets.find((candidate) => candidate.employeeId === employee.id && candidate.cycleId === activeCycle?.id);
      const employeeGoals = sheet ? goals.filter((goal) => goal.sheetId === sheet.id) : [];
      return (
        employeeGoals.length > 0 &&
        employeeGoals.every((goal) =>
          quarterlyUpdates.some(
            (update) => update.goalId === goal.id && update.quarter === quarter && update.cycleId === activeCycle?.id
          )
        )
      );
    }).length;
    const managerComplete = managerCheckins.filter(
      (checkin) => checkin.quarter === quarter && checkin.cycleId === activeCycle?.id
    ).length;
    return {
      quarter,
      achievementComplete,
      managerComplete,
      total: employeesWithApprovedGoals.length,
      rate: employeesWithApprovedGoals.length
        ? Math.round((managerComplete / employeesWithApprovedGoals.length) * 100)
        : 0,
    };
  });

  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">Admin workspace</p>
          <h1 style={{ margin: '0 0 6px 0' }}>Organization Overview</h1>
          <p className="app-page-meta">
            <span>{activeCycle?.name}</span>
            <span className="sep">·</span>
            <span>{formatDate(getCurrentDate())}</span>
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: '16px' }}>
        <StatCard label="Total Employees" value={`${allEmployees.length}`} icon={Users} />
        <StatCard label="Sheets Submitted" value={`${submitted}`} icon={FileText} />
        <StatCard label="Sheets Approved" value={`${approved}`} icon={CheckCircle2} tone={approved > 0 ? 'success' : undefined} />
        <StatCard label="Pending Approval" value={`${pending}`} icon={Clock} tone={pending > 0 ? 'warning' : undefined} />
      </div>

      {/* Progress */}
      <div className="card" style={{ padding: '24px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
          <h2>Cycle Completion</h2>
          <span className="text-[14px] text-[var(--text-secondary)] tabular-nums">{approved}/{allEmployees.length} approved · {pct}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-[var(--bg-muted)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--brand)] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            Quarterly Completion Dashboard
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Real-time employee achievement capture and manager check-in completion.
          </p>
        </div>
        <div className="app-table-scroll">
          <table className="app-table" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col />
              <col style={{ width: '180px' }} />
              <col style={{ width: '190px' }} />
              <col style={{ width: '150px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Quarter</th>
                <th style={{ textAlign: 'right' }}>Employee Updates</th>
                <th style={{ textAlign: 'right' }}>Manager Check-ins</th>
                <th style={{ textAlign: 'right' }}>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {completionRows.map((row) => (
                <tr key={row.quarter}>
                  <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{row.quarter}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {row.achievementComplete}/{row.total}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {row.managerComplete}/{row.total}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-flex',
                      minWidth: '58px',
                      justifyContent: 'center',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: row.rate >= 80
                        ? 'color-mix(in srgb, var(--success) 18%, transparent)'
                        : row.rate >= 50
                          ? 'color-mix(in srgb, var(--warning) 18%, transparent)'
                          : 'color-mix(in srgb, var(--danger) 18%, transparent)',
                      color: row.rate >= 80 ? 'var(--success)' : row.rate >= 50 ? 'var(--warning)' : 'var(--danger)',
                      border: row.rate >= 80
                        ? '1px solid color-mix(in srgb, var(--success) 36%, transparent)'
                        : row.rate >= 50
                          ? '1px solid color-mix(in srgb, var(--warning) 36%, transparent)'
                          : '1px solid color-mix(in srgb, var(--danger) 36%, transparent)',
                      fontSize: '12px',
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {row.rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="dashboard-with-rail">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '16px', width: '100%' }}>
        {[
          { label: 'Audit Trail', desc: `${auditLogs.length} entries logged`, href: '/admin/audit', icon: Shield },
          { label: 'Shared Goals', desc: 'Push departmental KPIs', href: '/admin/shared-goals', icon: Target },
          { label: 'Integrations', desc: 'Entra, email, Teams evidence', href: '/admin/integrations', icon: PlugZap },
        ].map((link) => {
          const LinkIcon = link.icon;
          return (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className="card-hover text-left w-full"
              style={{ padding: '20px', display: 'block', minHeight: '144px' }}
            >
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--brand-light)] flex items-center justify-center" style={{ marginBottom: '16px' }}>
                <LinkIcon className="w-5 h-5 text-[var(--brand)]" />
              </div>
              <p className="text-[15px] font-semibold" style={{ marginBottom: '4px' }}>{link.label}</p>
              <p className="text-[13px] text-[var(--text-secondary)]">{link.desc}</p>
            </button>
          );
        })}
          </div>
        </div>
        
        <div style={{ width: '100%', minWidth: 0 }}>
          <NotificationPanel />
        </div>
      </div>
    </div>
  );
}

// ─── Notification Panel ────────────────────────────────────────

function NotificationPanel({ variant = 'default', compact = false }: { variant?: 'default' | 'dashboardRail'; compact?: boolean }) {
  const user = useAuthStore((s) => s.user)!;
  const router = useRouter();
  const { notifications } = useDataStore();
  const visible = notifications.filter((n) => n.recipientId === user.id).slice(0, compact ? 2 : 4);

  if (visible.length === 0) return null;

  const getIconForType = (type: string) => {
    switch (type) {
      case 'GOAL_APPROVED': return <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />;
      case 'GOAL_RETURNED': return <AlertCircle className="w-4 h-4 text-[var(--danger)]" />;
      case 'CHECKIN_REMINDER': return <Clock className="w-4 h-4 text-[var(--warning)]" />;
      case 'ESCALATION': return <Shield className="w-4 h-4 text-[var(--danger)]" />;
      default: return <FileText className="w-4 h-4 text-[var(--brand)]" />;
    }
  };

  const getBgForType = (type: string) => {
    switch (type) {
      case 'GOAL_APPROVED': return 'color-mix(in srgb, var(--success) 18%, transparent)';
      case 'GOAL_RETURNED': return 'color-mix(in srgb, var(--danger) 18%, transparent)';
      case 'CHECKIN_REMINDER': return 'color-mix(in srgb, var(--warning) 18%, transparent)';
      case 'ESCALATION': return 'color-mix(in srgb, var(--danger) 18%, transparent)';
      default: return 'color-mix(in srgb, var(--brand) 18%, transparent)';
    }
  };

  return (
    <div
      className="card overflow-hidden"
      style={{
        width: '100%',
        alignSelf: 'start',
        minHeight: compact ? '136px' : variant === 'dashboardRail' ? '274px' : undefined,
      }}
    >
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--bg-surface-hover)]">
        <h2 className="text-[16px] font-bold text-[var(--text-primary)] leading-none">Inbox</h2>
        <span className="badge badge-active !h-6">{notifications.filter(n => n.recipientId === user.id).length} new</span>
      </div>
      <div className="flex flex-col">
        {visible.map((n, i) => (
          <button
            key={n.id}
            onClick={() => router.push(n.deepLink)}
            className={cn(
              'block w-full px-4 py-3 text-left transition-colors hover:bg-[var(--bg-surface-hover)]',
              i > 0 && 'border-t border-[var(--border)]'
            )}
          >
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0 mt-0.5" style={{ background: getBgForType(n.type) }}>
                {getIconForType(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug app-line-clamp-2 min-w-0">
                    {n.title}
                  </p>
                  <span className="text-[11px] text-[var(--text-tertiary)] shrink-0 font-medium whitespace-nowrap">
                    {formatDate(n.createdAt).split(',')[0]}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)] leading-snug break-words app-line-clamp-2">
                  {n.message}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-[var(--border)] px-4 py-3 text-center bg-[var(--bg-surface-hover)]">
        <button className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          View all activity
        </button>
      </div>
    </div>
  );
}
