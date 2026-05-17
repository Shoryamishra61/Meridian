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
import { BUSINESS_RULES, DEFAULT_CYCLE_WINDOWS, DEMO_ACCOUNTS, QUARTERS, STATUS_CONFIG, type Quarter } from '@/lib/constants';
import { formatScore, getScoreColor } from '@/lib/calculations';
import { cn, formatDate } from '@/lib/utils';
import { Target, CheckCircle2, Clock, AlertCircle, ArrowRight, FileText, PlugZap, Shield, Users } from 'lucide-react';
import GamificationBadges from '@/components/ui/GamificationBadges';

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

  const getWindowState = (opensAt: string, closesAt: string) => {
    const opens = new Date(opensAt);
    const closes = new Date(closesAt);
    if (currentDate >= opens && currentDate <= closes) return { state: 'active' as const, days: 0 };
    if (currentDate > closes) return { state: 'past' as const, days: 0 };
    return { state: 'future' as const, days: Math.ceil((opens.getTime() - currentDate.getTime()) / 86400000) };
  };

  const statusBadgeClass =
    sheet?.status === 'PENDING_APPROVAL' ? 'badge badge-pending' :
      sheet?.status === 'LOCKED' ? 'badge badge-approved' :
        sheet?.status === 'RETURNED' ? 'badge badge-returned' :
          'badge badge-draft';

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ═══ Page Header ═══ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-sm" style={{ marginBottom: '6px' }}>Employee workspace</p>
          <h1 style={{ marginBottom: '4px' }}>{user.name}</h1>
          <p className="text-[14px] text-[var(--text-secondary)]">
            {activeCycle?.name} cycle · {formatDate(currentDate)} · <span className={statusBadgeClass}>{sheetStatus}</span>
          </p>
        </div>
        <button
          onClick={() => router.push(myGoals.length === 0 ? '/goals?action=new' : '/goals')}
          className="btn-primary"
        >
          {myGoals.length === 0 ? 'Create goal sheet' : 'Open goal sheet'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ═══ Stat Cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: '20px' }}>
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

      {/* ═══ Main + Sidebar ═══ */}
      <div className="flex flex-col lg:flex-row" style={{ gap: '24px' }}>
        {/* Left: Goal Sheet */}
        <div className="flex-1 min-w-0">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)]" style={{ padding: '16px 24px' }}>
              <div>
                <h2>Goal sheet</h2>
                <p className="text-[13px] text-[var(--text-secondary)]" style={{ marginTop: '4px' }}>Draft, validate, and submit goals for L1 approval.</p>
              </div>
              <span className={statusBadgeClass}>{sheetStatus}</span>
            </div>

            {myGoals.length === 0 ? (
              <div style={{ padding: '48px 32px' }} className="text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--brand-light)] flex items-center justify-center" style={{ marginBottom: '20px' }}>
                  <Target className="w-7 h-7 text-[var(--brand)]" />
                </div>
                <h3 className="text-lg font-semibold" style={{ marginBottom: '8px' }}>No goals drafted yet</h3>
                <p className="text-[14px] text-[var(--text-secondary)] max-w-[42ch] mx-auto leading-relaxed" style={{ marginBottom: '28px' }}>
                  Create measurable goals tied to Revenue, Cost, or Quality and allocate exactly 100% weightage.
                </p>
                <button onClick={() => router.push('/goals?action=new')} className="btn-primary">
                  + Add First Goal
                </button>
                <div style={{ marginTop: '28px', paddingTop: '20px' }} className="border-t border-[var(--border)]">
                  <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                    <p className="text-[13px] text-[var(--text-secondary)]">0 / 100% weightage allocated</p>
                    <p className="text-[13px] font-semibold tabular-nums text-[var(--warning)]">Remaining 100%</p>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg-muted)]" />
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-canvas)]">
                      <th className="label-sm text-left px-6 py-3 w-10">#</th>
                      <th className="label-sm text-left px-4 py-3">Goal</th>
                      <th className="label-sm text-left px-4 py-3 w-28">Measure</th>
                      <th className="label-sm text-right px-4 py-3 w-20">Target</th>
                      <th className="label-sm text-right px-6 py-3 w-20">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myGoals.map((goal, i) => (
                      <tr
                        key={goal.id}
                        onClick={() => router.push('/goals')}
                        className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 text-[13px] tabular-nums text-[var(--text-muted)]">{i + 1}</td>
                        <td className="px-4 py-4">
                          <p className="text-[14px] font-medium truncate max-w-[280px]">{goal.title}</p>
                          <p className="text-[12px] text-[var(--text-muted)] truncate max-w-[280px] mt-0.5">{goal.description || 'No description'}</p>
                        </td>
                        <td className="px-4 py-4 text-[13px] text-[var(--text-secondary)]">{goal.uomType.replaceAll('_', ' ')}</td>
                        <td className="px-4 py-4 text-[13px] text-right tabular-nums text-[var(--text-secondary)]">{goal.target}</td>
                        <td className="px-6 py-4 text-[14px] text-right font-bold tabular-nums">{goal.weightage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar panels */}
        <div className="w-full lg:w-[280px] shrink-0" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Validation */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <h2 style={{ marginBottom: '16px' }}>Validation</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {completionItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0',
                    item.done ? 'bg-[var(--success)] text-white' : 'border-2 border-[var(--border-strong)]'
                  )}>
                    {item.done ? '✓' : ''}
                  </div>
                  <span className={cn('text-[14px]', item.done ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]')}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Q1 Heatmap */}
          {q1Updates.length > 0 && (
            <div className="card" style={{ padding: '20px 24px' }}>
              <h2 style={{ marginBottom: '16px' }}>Q1 Progress</h2>
              <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                {q1Updates.slice(0, 8).map(({ goal, update }) => (
                  <div
                    key={goal.id}
                    className={cn(
                      'rounded-[var(--radius-md)] border border-[var(--border)] p-3',
                      (update?.computedScore ?? 0) >= 0.8 ? 'bg-[var(--success-bg)]' :
                        (update?.computedScore ?? 0) >= 0.5 ? 'bg-[var(--warning-bg)]' :
                          'bg-[var(--danger-bg)]'
                    )}
                  >
                    <p className="truncate text-[12px] font-medium">{goal.title}</p>
                    <p className={cn('text-[15px] font-bold tabular-nums', getScoreColor(update?.computedScore ?? 0))}>
                      {formatScore(update?.computedScore ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          <GamificationBadges />

          {/* Cycle Windows */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <h2 style={{ marginBottom: '16px' }}>Cycle Windows</h2>
            <div>
              {DEFAULT_CYCLE_WINDOWS.map((window) => {
                const ws = getWindowState(window.opensAt, window.closesAt);
                return (
                  <div key={window.name} className={cn(
                    'flex items-center justify-between py-3 border-b border-[var(--border)] last:border-b-0',
                    ws.state === 'past' && 'opacity-40'
                  )}>
                    <span className={cn('text-[14px]', ws.state === 'active' ? 'font-semibold text-[var(--brand)]' : 'text-[var(--text-secondary)]')}>
                      {window.name}
                    </span>
                    {ws.state === 'active' && <span className="badge badge-active">Active</span>}
                    {ws.state === 'future' && <span className="text-[12px] text-[var(--text-muted)]">{ws.days}d</span>}
                    {ws.state === 'past' && <span className="text-[12px] text-[var(--text-muted)]">Past</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <NotificationPanel />
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
    <div className="card-hover flex flex-col justify-between" style={{ padding: '20px', minHeight: '120px' }}>
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
  const { goalSheets, goals, cycles } = useDataStore();

  const activeCycle = cycles.find((c) => c.isActive);
  const teamMembers = DEMO_ACCOUNTS.filter((a) => a.managerId === user.id);
  const teamSheets = goalSheets.filter((s) => teamMembers.some((m) => m.id === s.employeeId));

  const pendingApproval = teamSheets.filter((s) => s.status === 'PENDING_APPROVAL');
  const approved = teamSheets.filter((s) => s.status === 'LOCKED');
  const notStarted = teamMembers.length - teamSheets.length;

  const mgrStats = [
    { label: 'Team Size', value: teamMembers.length, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Pending Approval', value: pendingApproval.length, color: '#d97706', bg: '#fffbeb' },
    { label: 'Approved', value: approved.length, color: '#059669', bg: '#ecfdf5' },
    { label: 'Not Started', value: notStarted, color: '#64748b', bg: '#f8fafc' },
  ];

  const badgeStyle = (status: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, lineHeight: 1,
    ...(status === 'PENDING_APPROVAL' ? { background: '#fef3c7', color: '#92400e' }
      : status === 'LOCKED' ? { background: '#d1fae5', color: '#065f46' }
      : status === 'RETURNED' ? { background: '#fee2e2', color: '#991b1b' }
      : { background: '#f1f5f9', color: '#64748b' }),
  });

  const badgeLabel = (s: string) =>
    s === 'PENDING_APPROVAL' ? 'Pending' : s === 'LOCKED' ? 'Approved' : s === 'DRAFT' ? 'Draft' : s === 'RETURNED' ? 'Returned' : 'Not Started';

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Team Overview</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{activeCycle?.name} · {teamMembers.length} direct reports</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: '16px' }}>
        {mgrStats.map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
              </div>
            </div>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Pending action banner */}
      {pendingApproval.length > 0 && (
        <div style={{ background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⏳</span>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#92400e', margin: 0 }}>
              {pendingApproval.length} goal {pendingApproval.length === 1 ? 'sheet needs' : 'sheets need'} your review
            </p>
          </div>
          <button onClick={() => router.push('/team')} style={{ height: '36px', padding: '0 16px', borderRadius: '8px', background: '#2563eb', border: 'none', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Review Goals <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Team table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Team Members</h2>
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Department</th>
                <th style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Goals</th>
                <th style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, i) => {
                const memberSheet = teamSheets.find((s) => s.employeeId === member.id);
                const memberGoals = memberSheet ? goals.filter((g) => g.sheetId === memberSheet.id) : [];
                const status = memberSheet?.status || 'NOT_STARTED';
                return (
                  <tr
                    key={member.id}
                    onClick={() => router.push('/team')}
                    className="hover:bg-slate-50 transition-colors"
                    style={{ borderBottom: i < teamMembers.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {member.avatarInitials}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{member.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#475569' }}>{member.department}</td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#475569', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{memberGoals.length}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <span style={badgeStyle(status)}>{badgeLabel(status)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <NotificationPanel />
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
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ marginBottom: '4px' }}>Organization Overview</h1>
        <p className="text-[14px] text-[var(--text-secondary)]">
          {activeCycle?.name} · {formatDate(getCurrentDate())}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: '20px' }}>
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

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
            Quarterly Completion Dashboard
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Real-time employee achievement capture and manager check-in completion.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Quarter</th>
                <th style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Employee Updates</th>
                <th style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Manager Check-ins</th>
                <th style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {completionRows.map((row, index) => (
                <tr key={row.quarter} style={{ borderBottom: index < completionRows.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '13px 20px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{row.quarter}</td>
                  <td style={{ padding: '13px 20px', fontSize: '13px', color: '#475569', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {row.achievementComplete}/{row.total}
                  </td>
                  <td style={{ padding: '13px 20px', fontSize: '13px', color: '#475569', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {row.managerComplete}/{row.total}
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', minWidth: '58px', justifyContent: 'center', padding: '4px 10px', borderRadius: '6px', background: row.rate >= 80 ? '#ecfdf5' : row.rate >= 50 ? '#fffbeb' : '#fef2f2', color: row.rate >= 80 ? '#047857' : row.rate >= 50 ? '#b45309' : '#dc2626', fontSize: '12px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
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
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '20px' }}>
        {[
          { label: 'Audit Trail', desc: `${auditLogs.length} entries logged`, href: '/admin/audit', icon: Shield },
          { label: 'Shared Goals', desc: 'Push departmental KPIs', href: '/admin/shared-goals', icon: Target },
          { label: 'Integrations', desc: 'Entra, email, Teams evidence', href: '/admin/integrations', icon: PlugZap },
        ].map((link) => {
          const LinkIcon = link.icon;
          return (
            <button key={link.href} onClick={() => router.push(link.href)} className="card-hover text-left" style={{ padding: '24px' }}>
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--brand-light)] flex items-center justify-center" style={{ marginBottom: '16px' }}>
                <LinkIcon className="w-5 h-5 text-[var(--brand)]" />
              </div>
              <p className="text-[15px] font-semibold" style={{ marginBottom: '4px' }}>{link.label}</p>
              <p className="text-[13px] text-[var(--text-secondary)]">{link.desc}</p>
            </button>
          );
        })}
      </div>

      <NotificationPanel />
    </div>
  );
}

// ─── Notification Panel ────────────────────────────────────────

function NotificationPanel() {
  const user = useAuthStore((s) => s.user)!;
  const { notifications } = useDataStore();
  const visible = notifications.filter((n) => n.recipientId === user.id).slice(0, 3);

  if (visible.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <h2>Notifications</h2>
      </div>
      {visible.map((n, i) => (
        <div key={n.id} className={cn('px-6 py-4', i > 0 && 'border-t border-[var(--border)]')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium">{n.title}</p>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">{n.message}</p>
            </div>
            <span className="badge badge-active shrink-0">Teams</span>
          </div>
          <details className="mt-3">
            <summary className="text-[12px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
              View Adaptive Card payload
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto rounded-[var(--radius-md)] bg-[var(--bg-canvas)] border border-[var(--border)] p-3 text-[11px] text-[var(--text-secondary)] font-mono">
              {JSON.stringify(n.teamsCardJson, null, 2)}
            </pre>
          </details>
        </div>
      ))}
    </div>
  );
}
