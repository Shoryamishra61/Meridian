/**
 * Meridian — Shared Goals
 * Admin/Manager KPI push with BRD read-only rules for recipients.
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { BUSINESS_RULES, DEMO_ACCOUNTS, UOM_LABELS, type UoMType } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function SharedGoalsPage() {
  const user = useAuthStore((state) => state.user)!;
  const { addAuditLog, addGoal, addNotification, cycles, getOrCreateSheet, goals, goalSheets, thrustAreas } = useDataStore();
  const activeCycle = cycles.find((cycle) => cycle.isActive);
  const employees = DEMO_ACCOUNTS.filter((account) => account.role === 'EMPLOYEE');

  const [showForm, setShowForm] = useState(false);
  const [thrustAreaId, setThrustAreaId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uomType, setUomType] = useState<UoMType>('PERCENTAGE_MIN');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [defaultWeightage, setDefaultWeightage] = useState('20');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const sharedGroups = [...new Set(goals.filter((goal) => goal.isShared).map((goal) => goal.sharedFromId))].filter(
    (groupId): groupId is string => Boolean(groupId)
  );

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
          title: title.trim(),
          description: description.trim() || null,
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
            ? `You are the primary owner for "${title.trim()}". Your achievement updates sync to all linked sheets.`
            : `"${title.trim()}" was added as a read-only shared KPI. You may adjust weightage only.`,
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
      newValue: { title: title.trim(), primaryOwnerId, selectedEmployees },
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
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Shared Goals</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Push departmental KPIs. Recipients can edit only weightage.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ height: '36px', padding: '0 16px', borderRadius: '8px', border: 'none', background: '#2563eb', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
        >Push shared goal</button>
      </div>

      {sharedGroups.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ fontSize: '22px' }}>🎯</span>
          </div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0' }}>No shared KPIs yet</p>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
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
              <div key={groupId} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>{firstGoal.title}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                      {UOM_LABELS[firstGoal.uomType]} · Target {firstGoal.uomType === 'TIMELINE' && firstGoal.targetDate
                        ? new Date(firstGoal.targetDate).toLocaleDateString('en-IN')
                        : firstGoal.target}
                    </p>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#eff6ff', color: '#2563eb' }}>
                    {groupGoals.length} linked
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Employee</th>
                      <th style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Rule</th>
                      <th style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Weight</th>
                      <th style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupGoals.map((goal, gi) => {
                      const sheet = goalSheets.find((candidate) => candidate.id === goal.sheetId);
                      const employee = sheet ? DEMO_ACCOUNTS.find((account) => account.id === sheet.employeeId) : null;
                      return (
                        <tr key={goal.id} style={{ borderTop: gi > 0 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '10px 20px', fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{employee?.name || 'Employee'}</td>
                          <td style={{ padding: '10px 20px', fontSize: '12px', color: '#64748b' }}>{goal.isOwner ? 'Controls actuals' : 'Weightage only'}</td>
                          <td style={{ padding: '10px 20px', fontSize: '13px', color: '#0f172a', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{goal.weightage}%</td>
                          <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: ownerAccount?.id === employee?.id ? '#ecfdf5' : '#f1f5f9', color: ownerAccount?.id === employee?.id ? '#065f46' : '#64748b' }}>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div
            className="w-full max-w-2xl mx-4 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-overlay)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 h-12 border-b border-[var(--border)]">
              <h2 className="text-[14px] font-semibold">Push shared goal</h2>
              <button
                onClick={() => setShowForm(false)}
                className="btn-press h-11 w-11 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <FormField label="Thrust Area">
                <select value={thrustAreaId} onChange={(event) => setThrustAreaId(event.target.value)} className={inputClass}>
                  <option value="">Select</option>
                  {thrustAreas.filter((area) => area.isActive).map((area) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Goal Title">
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={BUSINESS_RULES.MAX_TITLE_LENGTH} className={inputClass} />
              </FormField>

              <FormField label="Description">
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className={cn(inputClass, 'h-auto py-2 resize-none')} />
              </FormField>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField label="UoM">
                  <select value={uomType} onChange={(event) => setUomType(event.target.value as UoMType)} className={inputClass}>
                    {(Object.keys(UOM_LABELS) as UoMType[]).map((type) => (
                      <option key={type} value={type}>{UOM_LABELS[type]}</option>
                    ))}
                  </select>
                </FormField>
                {uomType === 'TIMELINE' ? (
                  <FormField label="Deadline">
                    <input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className={inputClass} />
                  </FormField>
                ) : (
                  <FormField label="Target">
                    <input type="number" value={uomType === 'ZERO_BASED' ? '0' : target} onChange={(event) => setTarget(event.target.value)} disabled={uomType === 'ZERO_BASED'} className={inputClass} />
                  </FormField>
                )}
                <FormField label="Weightage">
                  <input type="number" min={BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL} value={defaultWeightage} onChange={(event) => setDefaultWeightage(event.target.value)} className={inputClass} />
                </FormField>
              </div>

              <div>
                <p className="text-[13px] font-medium text-[var(--text-secondary)] mb-2">
                  Recipients <span className="text-[11px] text-[var(--text-tertiary)]">(first selected becomes primary owner)</span>
                </p>
                <div className="space-y-1">
                  {employees.map((employee) => {
                    const selected = selectedEmployees.includes(employee.id);
                    const isPrimary = selected && selectedEmployees[0] === employee.id;
                    return (
                      <button
                        key={employee.id}
                        onClick={() => toggleEmployee(employee.id)}
                        className={cn(
                          'btn-press w-full grid grid-cols-12 gap-3 items-center px-3 py-2 rounded-[var(--radius-md)] border text-left transition-colors',
                          selected
                            ? 'border-[var(--brand)] bg-[var(--brand-muted)]'
                            : 'border-[var(--border)] hover:bg-[var(--bg-muted)]'
                        )}
                      >
                        <span className="col-span-5 text-[13px] font-medium">{employee.name}</span>
                        <span className="col-span-4 text-[12px] text-[var(--text-secondary)]">{employee.department}</span>
                        <span className="col-span-3 text-[11px] text-right text-[var(--text-tertiary)]">
                          {isPrimary ? 'Primary owner' : selected ? 'Linked recipient' : 'Not selected'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 h-14 items-center border-t border-[var(--border)]">
              <button onClick={() => setShowForm(false)} className="btn-press min-h-11 px-4 rounded-[var(--radius-md)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]">
                Cancel
              </button>
              <button onClick={handlePush} className="btn-press min-h-11 px-4 rounded-[var(--radius-md)] bg-[var(--brand)] text-[var(--text-inverse)] text-[13px] font-medium hover:bg-[var(--brand-hover)]">
                Push to {selectedEmployees.length}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  'w-full min-h-11 px-3 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] border border-[var(--border)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--brand)] disabled:opacity-50';

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}
