/**
 * Meridian — Shared Goals
 * Admin/Manager KPI push with BRD read-only rules for recipients.
 */

'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { BUSINESS_RULES, DEMO_ACCOUNTS, UOM_LABELS, type UoMType } from '@/lib/constants';
import { sanitizeTextInput } from '@/lib/sanitize';

export default function SharedGoalsPage() {
  const user = useAuthStore((state) => state.user)!;
  const { addAuditLog, addGoal, addNotification, cycles, getOrCreateSheet, goals, goalSheets, thrustAreas } = useDataStore();
  const activeCycle = cycles.find((cycle) => cycle.isActive);

  /**
   * Recipient pool scoped by role:
   * - ADMIN can push to anyone in the org.
   * - MANAGER can push only to their direct reports.
   * Prevents managers from cross-pushing KPIs to other teams' employees.
   */
  const employees = useMemo(() => {
    if (user.role === 'ADMIN') {
      return DEMO_ACCOUNTS.filter((account) => account.role === 'EMPLOYEE');
    }
    return DEMO_ACCOUNTS.filter(
      (account) => account.role === 'EMPLOYEE' && account.managerId === user.id
    );
  }, [user.id, user.role]);

  const recipientScopeLabel =
    user.role === 'ADMIN' ? 'All employees' : 'Your direct reports';

  const [showForm, setShowForm] = useState(false);
  const [thrustAreaId, setThrustAreaId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uomType, setUomType] = useState<UoMType>('PERCENTAGE_MIN');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [defaultWeightage, setDefaultWeightage] = useState('20');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  /**
   * Visible shared-goal groups, scoped by viewer role.
   * Admins see all org-wide shared KPIs. Managers see groups in which at least
   * one of their direct reports is a recipient.
   */
  const sharedGroups = useMemo(() => {
    const allowedEmployeeIds = new Set<string>(employees.map((employee) => employee.id));
    const groupIds = new Set<string>();
    goals.forEach((goal) => {
      if (!goal.isShared || !goal.sharedFromId) return;
      if (user.role === 'ADMIN') {
        groupIds.add(goal.sharedFromId);
        return;
      }
      const sheet = goalSheets.find((candidate) => candidate.id === goal.sheetId);
      if (sheet && allowedEmployeeIds.has(sheet.employeeId)) {
        groupIds.add(goal.sharedFromId);
      }
    });
    return Array.from(groupIds);
  }, [goals, goalSheets, employees, user.role]);

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees((previous) =>
      previous.includes(employeeId)
        ? previous.filter((candidate) => candidate !== employeeId)
        : [...previous, employeeId]
    );
  };

  const handlePush = () => {
    if (!activeCycle) return;
    const weightage = Number(defaultWeightage);
    if (!title.trim() || !thrustAreaId || selectedEmployees.length === 0) {
      toast.error('Complete the shared goal fields and select recipients.');
      return;
    }
    // Defense in depth: verify all selected recipients are in the allowed scope.
    const allowedIds = new Set<string>(employees.map((employee) => employee.id));
    const outOfScope = selectedEmployees.filter((id) => !allowedIds.has(id));
    if (outOfScope.length > 0) {
      toast.error('Some recipients are outside your authorized scope', {
        description: 'Managers can only push shared goals to their direct reports.',
      });
      return;
    }
    if (uomType === 'TIMELINE' && !targetDate) {
      toast.error('Timeline goals require a deadline.');
      return;
    }
    if (uomType !== 'TIMELINE' && uomType !== 'ZERO_BASED' && (!target || Number(target) <= 0)) {
      toast.error('Enter a valid target value.');
      return;
    }
    if (weightage < BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL) {
      toast.error(`Minimum weightage is ${BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}%.`);
      return;
    }

    const cleanTitle = sanitizeTextInput(title);
    const cleanDescription = description.trim() ? sanitizeTextInput(description) : null;
    if (!cleanTitle.trim()) {
      toast.error('Goal title is required after sanitization.');
      return;
    }

    const sharedGroupId = `shared-${Date.now()}`;
    const primaryOwnerId = selectedEmployees[0];
    let pushed = 0;

    selectedEmployees.forEach((employeeId) => {
      const sheet = getOrCreateSheet(employeeId, activeCycle.id);
      const sheetGoals = goals.filter((goal) => goal.sheetId === sheet.id);
      if (sheetGoals.length >= BUSINESS_RULES.MAX_GOALS_PER_CYCLE) {
        toast.error(`${DEMO_ACCOUNTS.find((account) => account.id === employeeId)?.name} already has 8 goals. Skipped.`);
        return;
      }
      const nextTotal = sheetGoals.reduce((sum, goal) => sum + goal.weightage, 0) + weightage;
      if (nextTotal > BUSINESS_RULES.TOTAL_WEIGHTAGE) {
        toast.error(`${DEMO_ACCOUNTS.find((account) => account.id === employeeId)?.name} skipped`, {
          description: `Shared goal would make total weightage ${nextTotal}%. Lower default weightage or unlock space first.`,
        });
        return;
      }

      try {
        addGoal({
          sheetId: sheet.id,
          thrustAreaId,
          title: cleanTitle,
          description: cleanDescription,
          uomType,
          target: uomType === 'ZERO_BASED' || uomType === 'TIMELINE' ? 0 : Number(target),
          targetDate: uomType === 'TIMELINE' ? new Date(targetDate) : null,
          weightage,
          isShared: true,
          sharedFromId: sharedGroupId,
          isOwner: employeeId === primaryOwnerId,
        });
      } catch (error) {
        toast.error(`${DEMO_ACCOUNTS.find((account) => account.id === employeeId)?.name || 'Employee'} skipped`, {
          description: error instanceof Error ? error.message : 'Unable to assign shared goal.',
        });
        return;
      }

      addNotification({
        type: 'CHECKIN_REMINDER',
        recipientId: employeeId,
        title: 'Shared goal assigned',
        message:
          employeeId === primaryOwnerId
            ? `You are the primary owner for "${cleanTitle}". Your achievement updates sync to all linked sheets.`
            : `"${cleanTitle}" was added as a read-only shared KPI. You may adjust weightage only.`,
        deepLink: '/goals',
      });
      pushed += 1;
    });

    addAuditLog({
      entityType: 'shared_goal',
      entityId: sharedGroupId,
      action: 'PUSH_SHARED_GOAL',
      fieldName: 'recipients',
      oldValue: null,
      newValue: { title: cleanTitle, primaryOwnerId, selectedEmployees },
      changedBy: user.id,
      ipAddress: null,
      userAgent: null,
    });

    toast.success(`Shared goal pushed to ${pushed} employees`, {
      description: 'First selected employee is the primary achievement owner.',
    });
    setShowForm(false);
    setThrustAreaId('');
    setTitle('');
    setDescription('');
    setTarget('');
    setTargetDate('');
    setSelectedEmployees([]);
  };

  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">Admin workspace</p>
          <h1 style={{ margin: '0 0 6px 0' }}>Shared Goals</h1>
          <p className="app-page-meta">Push departmental KPIs. Recipients can edit only weightage.</p>
        </div>
        <div className="app-page-actions">
          <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
            Push shared goal
          </button>
        </div>
      </header>

      {sharedGroups.length === 0 ? (
        <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ fontSize: '22px' }}>🎯</span>
          </div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>No shared KPIs yet</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Create a departmental KPI and assign it to employees. Linked achievement updates will sync from the primary owner.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sharedGroups.map((groupId) => {
            const groupGoals = goals.filter((goal) => goal.sharedFromId === groupId);
            const firstGoal = groupGoals[0];
            const owner = groupGoals.find((goal) => goal.isOwner);
            const ownerSheet = owner ? goalSheets.find((sheet) => sheet.id === owner.sheetId) : null;
            const ownerAccount = ownerSheet ? DEMO_ACCOUNTS.find((account) => account.id === ownerSheet.employeeId) : null;

            return (
              <div key={groupId} style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>{firstGoal.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                      {UOM_LABELS[firstGoal.uomType]} · Target {firstGoal.uomType === 'TIMELINE' && firstGoal.targetDate
                        ? new Date(firstGoal.targetDate).toLocaleDateString('en-IN')
                        : firstGoal.target}
                    </p>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'var(--brand-light)', color: 'var(--brand)' }}>
                    {groupGoals.length} linked
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-canvas)' }}>
                      <th style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Employee</th>
                      <th style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Rule</th>
                      <th style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Weight</th>
                      <th style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupGoals.map((goal, gi) => {
                      const sheet = goalSheets.find((candidate) => candidate.id === goal.sheetId);
                      const employee = sheet ? DEMO_ACCOUNTS.find((account) => account.id === sheet.employeeId) : null;
                      return (
                        <tr key={goal.id} style={{ borderTop: gi > 0 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '10px 20px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{employee?.name || 'Employee'}</td>
                          <td style={{ padding: '10px 20px', fontSize: '12px', color: 'var(--text-secondary)' }}>{goal.isOwner ? 'Controls actuals' : 'Weightage only'}</td>
                          <td style={{ padding: '10px 20px', fontSize: '13px', color: 'var(--text-primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{goal.weightage}%</td>
                          <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: ownerAccount?.id === employee?.id ? 'var(--success-bg)' : 'var(--bg-muted)', color: ownerAccount?.id === employee?.id ? 'var(--success)' : 'var(--text-secondary)' }}>
                              {ownerAccount?.id === employee?.id ? 'Primary' : 'Linked'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {showForm && createPortal(
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div
            className="modal-panel"
            style={{ maxWidth: '600px' }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Push shared goal</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close"
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* ── Form ── */}
            <div style={{ padding: '28px', maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Thrust Area */}
              <div>
                <label style={SH.label}>Thrust Area<span style={SH.req}>*</span></label>
                <select value={thrustAreaId} onChange={(event) => setThrustAreaId(event.target.value)} style={SH.input}>
                  <option value="">Select…</option>
                  {thrustAreas.filter((area) => area.isActive).map((area) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>

              {/* Goal Title */}
              <div>
                <label style={SH.label}>Goal Title<span style={SH.req}>*</span></label>
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={BUSINESS_RULES.MAX_TITLE_LENGTH} placeholder="e.g., Increase Q2 sales by 20%" style={SH.input} />
              </div>

              {/* Description */}
              <div>
                <label style={SH.label}>Description</label>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="What this goal aims to achieve…" style={SH.textarea} />
              </div>

              {/* UoM / Target / Weightage row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={SH.label}>UoM</label>
                  <select value={uomType} onChange={(event) => setUomType(event.target.value as UoMType)} style={SH.input}>
                    {(Object.keys(UOM_LABELS) as UoMType[]).map((type) => (
                      <option key={type} value={type}>{UOM_LABELS[type]}</option>
                    ))}
                  </select>
                </div>
                {uomType === 'TIMELINE' ? (
                  <div>
                    <label style={SH.label}>Deadline</label>
                    <input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} style={SH.input} />
                  </div>
                ) : (
                  <div>
                    <label style={SH.label}>Target</label>
                    <input type="number" value={uomType === 'ZERO_BASED' ? '0' : target} onChange={(event) => setTarget(event.target.value)} disabled={uomType === 'ZERO_BASED'} style={SH.input} />
                  </div>
                )}
                <div>
                  <label style={SH.label}>Weightage (%)</label>
                  <input type="number" min={BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL} value={defaultWeightage} onChange={(event) => setDefaultWeightage(event.target.value)} style={SH.input} />
                </div>
              </div>

              {/* Recipients */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                    Recipients <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 400 }}>(first selected becomes primary owner)</span>
                  </p>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand)', background: 'var(--brand-light)', padding: '3px 8px', borderRadius: '6px' }}>
                    Scope: {recipientScopeLabel}
                  </span>
                </div>
                {employees.length === 0 ? (
                  <div style={{ padding: '20px', borderRadius: '10px', background: 'var(--bg-canvas)', border: '1px dashed var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      No employees report to you. Shared goals can only be pushed to your direct reports.
                    </p>
                  </div>
                ) : null}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {employees.map((employee) => {
                    const selected = selectedEmployees.includes(employee.id);
                    const isPrimary = selected && selectedEmployees[0] === employee.id;
                    return (
                      <button
                        key={employee.id}
                        onClick={() => toggleEmployee(employee.id)}
                        style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', gap: '8px',
                          width: '100%', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                          border: selected ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
                          background: selected ? 'var(--brand-light)' : 'var(--bg-surface)',
                          transition: 'all 150ms',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{employee.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{employee.department}</span>
                        <span style={{ fontSize: '11px', color: isPrimary ? '#2563eb' : selected ? '#059669' : '#94a3b8', textAlign: 'right', fontWeight: 500 }}>
                          {isPrimary ? 'Primary owner' : selected ? 'Linked' : 'Not selected'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '16px 28px', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowForm(false)}
                style={{ height: '40px', padding: '0 20px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handlePush}
                style={{ height: '40px', padding: '0 24px', borderRadius: '10px', border: 'none', background: 'var(--brand)', color: 'var(--text-inverse)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                Push to {selectedEmployees.length}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Shared inline style objects (matches GoalCreateDialog pattern) ── */
const SH = {
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' } as React.CSSProperties,
  req: { color: 'var(--danger)', marginLeft: '2px' } as React.CSSProperties,
  input: {
    width: '100%', height: '44px', padding: '0 36px 0 14px',
    borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-canvas)',
    fontSize: '14px', color: 'var(--text-primary)', outline: 'none',
    transition: 'border-color 150ms, box-shadow 150ms',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden'
  } as React.CSSProperties,
  textarea: {
    width: '100%', padding: '12px 14px', minHeight: '72px',
    borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-canvas)',
    fontSize: '14px', color: 'var(--text-primary)', outline: 'none', resize: 'none' as const,
    fontFamily: 'inherit', lineHeight: '1.5',
  } as React.CSSProperties,
};
