/**
 * Meridian — Quarterly Check-ins
 * Employee achievement capture + manager coaching comments, time-gated by the
 * ATOMQUEST schedule and the demo date provider.
 * ALL styling uses inline styles for guaranteed rendering.
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useDemoDateStore } from '@/stores/demo-date-store';
import {
  BUSINESS_RULES,
  DEMO_ACCOUNTS,
  getCheckinQuarterForDate,
  getWindowMessageForDate,
  PROGRESS_STATUS_CONFIG,
  UOM_LABELS,
  type ProgressStatus,
  type Quarter,
} from '@/lib/constants';
import { calculateProgressScore, formatScore, getScoreColor } from '@/lib/calculations';
import { validateAchievementInput, validateQuarterWindow } from '@/server/domain/goal-policy';
import { formatDate } from '@/lib/utils';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

/* ── Shared Inline Styles ── */
const I = {
  input: {
    width: '100%', height: '36px', padding: '0 10px',
    borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#f8fafc',
    fontSize: '13px', color: '#0f172a', outline: 'none',
  } as React.CSSProperties,
  label: { fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.04em' } as React.CSSProperties,
};

interface GoalCheckinFormState {
  actual: string;
  completionDate: string;
  status: ProgressStatus;
  notes: string;
  selfProgress: string;
}

function getNextWindowCountdown(date: Date): string {
  const windows = [
    { label: 'Q1', opens: new Date('2025-07-01') },
    { label: 'Q2', opens: new Date('2025-10-01') },
    { label: 'Q3', opens: new Date('2026-01-01') },
    { label: 'Q4', opens: new Date('2026-03-01') },
  ];
  const next = windows.find((window) => date < window.opens);
  if (!next) return 'Next cycle opens in May.';
  const days = Math.ceil((next.opens.getTime() - date.getTime()) / 86400000);
  return `${next.label} opens in ${days} days.`;
}

export default function CheckinsPage() {
  const user = useAuthStore((state) => state.user)!;
  if (user.role === 'MANAGER') return <ManagerCheckin />;
  return <EmployeeCheckin />;
}

function EmployeeCheckin() {
  const user = useAuthStore((state) => state.user)!;
  const { cycles, goalSheets, goals, quarterlyUpdates, submitQuarterlyUpdate, isQuarterLocked } = useDataStore();
  const getCurrentDate = useDemoDateStore((state) => state.getCurrentDate);
  const currentDate = getCurrentDate();
  const activeQuarter = getCheckinQuarterForDate(currentDate);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>(activeQuarter || 'Q1');
  const [formData, setFormData] = useState<Record<string, GoalCheckinFormState>>({});

  const activeCycle = cycles.find((c) => c.isActive);
  const sheet = goalSheets.find(
    (s) => s.employeeId === user.id && s.cycleId === activeCycle?.id && (s.status === 'LOCKED' || s.status === 'APPROVED')
  );
  const myGoals = sheet ? goals.filter((g) => g.sheetId === sheet.id).sort((a, b) => a.displayOrder - b.displayOrder) : [];
  const isWindowOpen = validateQuarterWindow(currentDate, selectedQuarter).ok;
  const locked = activeCycle ? isQuarterLocked(user.id, selectedQuarter, activeCycle.id) : false;

  const getGoalFormData = (goalId: string): GoalCheckinFormState => {
    const draft = formData[goalId];
    if (draft) return draft;
    const existing = quarterlyUpdates.find((u) => u.goalId === goalId && u.quarter === selectedQuarter);
    return {
      actual: existing?.actualAchievement?.toString() || '',
      completionDate: existing?.completionDate ? new Date(existing.completionDate).toISOString().slice(0, 10) : '',
      status: existing?.status || 'NOT_STARTED',
      notes: existing?.notes || '',
      selfProgress: existing?.computedScore != null ? String(Math.round(existing.computedScore * 100)) : '',
    };
  };

  const updateField = <K extends keyof GoalCheckinFormState>(goalId: string, field: K, value: GoalCheckinFormState[K]) => {
    setFormData((prev) => ({ ...prev, [goalId]: { ...prev[goalId], [field]: value } }));
  };

  const handleSave = () => {
    if (!activeCycle || !sheet) return;
    if (!isWindowOpen) { toast.error('Check-in window closed', { description: `${selectedQuarter} capture is not open for ${formatDate(currentDate)}.` }); return; }
    if (locked) { toast.error(`${selectedQuarter} is locked`, { description: 'Your manager has already completed this check-in discussion.' }); return; }

    const validationError = myGoals.map((goal) => {
      const data = getGoalFormData(goal.id);
      const actual = goal.uomType === 'TIMELINE' ? null : data.actual.trim() === '' ? null : Number(data.actual);
      const policy = validateAchievementInput({ uomType: goal.uomType, status: data.status, actualAchievement: actual, completionDate: data.completionDate ? new Date(data.completionDate) : null });
      return policy.ok ? null : { goalTitle: goal.title, message: policy.message };
    }).find(Boolean);

    if (validationError) { toast.error('Check-in needs actual achievement', { description: `${validationError.goalTitle}: ${validationError.message}` }); return; }

    myGoals.forEach((goal) => {
      const data = getGoalFormData(goal.id);
      const actual = goal.uomType === 'TIMELINE' ? 0 : Number(data.actual || 0);
      const computedScore = calculateProgressScore({ uomType: goal.uomType, target: goal.target, actual, targetDate: goal.targetDate, completionDate: data.completionDate || null });
      submitQuarterlyUpdate({
        goalId: goal.id, quarter: selectedQuarter, cycleId: activeCycle.id, actualAchievement: actual,
        completionDate: data.completionDate ? new Date(data.completionDate) : null, status: data.status,
        computedScore, notes: [data.selfProgress ? `Self progress: ${data.selfProgress}%` : '', data.notes].filter(Boolean).join(' — ') || null, updatedBy: user.id,
      });
    });
    toast.success(`${selectedQuarter} check-in saved`, { description: 'Progress scores were computed using the BRD formulas.' });
  };

  /* ── Empty State ── */
  if (!sheet) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Quarterly Check-ins</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>{getWindowMessageForDate(currentDate)}</p>
        </div>
        <div className="card" style={{ padding: '60px 40px', textAlign: 'center', maxWidth: '560px', margin: '40px auto 0' }}>
          <div style={{ width: '56px', height: '56px', margin: '0 auto 20px', borderRadius: '16px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 15V3M12 15L8 11M12 15L16 11M2 17L2.621 19.485C2.72915 19.9177 2.97882 20.3018 3.33033 20.5763C3.68184 20.8508 4.11501 20.9999 4.561 21H19.439C19.885 20.9999 20.3182 20.8508 20.6697 20.5763C21.0212 20.3018 21.2708 19.9177 21.379 19.485L22 17" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>Goals are not approved yet</p>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
            Achievement capture opens after your manager approves and locks your goal sheet.
          </p>
        </div>
      </div>
    );
  }

  /* ── Main View ── */
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Quarterly Check-ins</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
            {getWindowMessageForDate(currentDate)} • Demo date {formatDate(currentDate)}
          </p>
        </div>
        <button onClick={handleSave} disabled={!isWindowOpen || locked}
          style={{
            height: '40px', padding: '0 20px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: isWindowOpen && !locked ? 'pointer' : 'not-allowed',
            background: isWindowOpen && !locked ? '#2563eb' : '#e2e8f0', color: isWindowOpen && !locked ? '#ffffff' : '#94a3b8',
          }}>
          Save check-in
        </button>
      </div>

      {/* Quarter Selector */}
      <QuarterSelector selectedQuarter={selectedQuarter} activeQuarter={activeQuarter} onChange={setSelectedQuarter} />

      {/* Warnings */}
      {!isWindowOpen && (
        <div style={{ padding: '14px 18px', marginBottom: '16px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#92400e', margin: '0 0 2px 0' }}>This quarter is not open for achievement capture.</p>
          <p style={{ fontSize: '13px', color: '#a16207', margin: 0 }}>{getNextWindowCountdown(currentDate)} Use the debug date selector only during internal demo prep.</p>
        </div>
      )}
      {locked && (
        <div style={{ padding: '14px 18px', marginBottom: '16px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '3px solid #22c55e' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#166534', margin: '0 0 2px 0' }}>{selectedQuarter} check-in is complete.</p>
          <p style={{ fontSize: '13px', color: '#15803d', margin: 0 }}>Manager comments have locked this quarter&apos;s achievement data.</p>
        </div>
      )}

      {/* Goals Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr 1fr 1fr 1fr', gap: '12px', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <span style={I.label}>Goal</span>
          <span style={{ ...I.label, textAlign: 'right' }}>Planned</span>
          <span style={I.label}>Actual</span>
          <span style={I.label}>Rate</span>
          <span style={I.label}>Status</span>
          <span style={{ ...I.label, textAlign: 'right' }}>Score</span>
        </div>

        {/* Goal Rows */}
        {myGoals.map((goal, index) => {
          const data = getGoalFormData(goal.id);
          const actual = goal.uomType === 'TIMELINE' ? 0 : Number(data.actual || 0);
          const score = calculateProgressScore({ uomType: goal.uomType, target: goal.target, actual, targetDate: goal.targetDate, completionDate: data.completionDate || null });
          const disabled = !isWindowOpen || locked;

          return (
            <div key={goal.id} style={{
              display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr 1fr 1fr 1fr', gap: '12px', alignItems: 'start',
              padding: '16px 20px', borderBottom: index < myGoals.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              {/* Goal info */}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{UOM_LABELS[goal.uomType]}</p>
              </div>

              {/* Planned */}
              <span style={{ fontSize: '14px', color: '#475569', textAlign: 'right', fontVariantNumeric: 'tabular-nums', paddingTop: '2px' }}>
                {goal.uomType === 'TIMELINE' && goal.targetDate
                  ? new Date(goal.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                  : goal.target}
              </span>

              {/* Actual input */}
              <div>
                {goal.uomType === 'TIMELINE' ? (
                  <input type="date" value={data.completionDate} onChange={(e) => updateField(goal.id, 'completionDate', e.target.value)}
                    disabled={disabled} style={{ ...I.input, opacity: disabled ? 0.5 : 1 }} />
                ) : (
                  <input type="number" value={data.actual} onChange={(e) => updateField(goal.id, 'actual', e.target.value)}
                    disabled={disabled} min={0} style={{ ...I.input, opacity: disabled ? 0.5 : 1 }} />
                )}
                <input value={data.notes} onChange={(e) => updateField(goal.id, 'notes', e.target.value)}
                  disabled={disabled} placeholder="Note…"
                  style={{ width: '100%', height: '28px', padding: '0 10px', marginTop: '6px', borderRadius: '6px', border: '1px solid transparent', background: 'transparent', fontSize: '12px', color: '#64748b', outline: 'none', opacity: disabled ? 0.5 : 1 }} />
              </div>

              {/* Self Rate */}
              <input type="number" value={data.selfProgress}
                onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, '').slice(0, 3); updateField(goal.id, 'selfProgress', v ? String(Math.min(100, Number(v))) : ''); }}
                disabled={disabled} min={0} max={100} placeholder="0-100"
                style={{ ...I.input, opacity: disabled ? 0.5 : 1 }} />

              {/* Status */}
              <select value={data.status} onChange={(e) => updateField(goal.id, 'status', e.target.value as ProgressStatus)}
                disabled={disabled} style={{ ...I.input, opacity: disabled ? 0.5 : 1 }}>
                <option value="NOT_STARTED">Not Started</option>
                <option value="ON_TRACK">On Track</option>
                <option value="COMPLETED">Completed</option>
              </select>

              {/* Score */}
              <div style={{ textAlign: 'right' }}>
                <p className={getScoreColor(score)} style={{ fontSize: '16px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', margin: '0 0 2px 0' }}>{formatScore(score)}</p>
                <p style={{ fontSize: '11px', color: '#cbd5e1', margin: 0 }}>tracking</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ManagerCheckin() {
  const user = useAuthStore((state) => state.user)!;
  const { cycles, goalSheets, goals, quarterlyUpdates, managerCheckins, submitManagerCheckin } = useDataStore();
  const getCurrentDate = useDemoDateStore((state) => state.getCurrentDate);
  const currentDate = getCurrentDate();
  const activeQuarter = getCheckinQuarterForDate(currentDate);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>(activeQuarter || 'Q1');
  const [comments, setComments] = useState<Record<string, string>>({});

  const activeCycle = cycles.find((c) => c.isActive);
  const teamMembers = DEMO_ACCOUNTS.filter((a) => a.managerId === user.id);
  const isWindowOpen = validateQuarterWindow(currentDate, selectedQuarter).ok;

  const handleSaveComment = (employeeId: string) => {
    if (!activeCycle) return;
    const windowPolicy = validateQuarterWindow(currentDate, selectedQuarter);
    if (!windowPolicy.ok) { toast.error('Check-in window closed', { description: windowPolicy.message }); return; }
    const comment = comments[employeeId]?.trim();
    if (!comment || comment.length < BUSINESS_RULES.MIN_CHECKIN_COMMENT_LENGTH) {
      toast.error('Add a structured check-in comment', { description: `Use at least ${BUSINESS_RULES.MIN_CHECKIN_COMMENT_LENGTH} characters to document the discussion.` });
      return;
    }
    try {
      submitManagerCheckin({ managerId: user.id, employeeId, quarter: selectedQuarter, cycleId: activeCycle.id, comment });
      toast.success(`${selectedQuarter} check-in completed`);
      setComments((prev) => ({ ...prev, [employeeId]: '' }));
    } catch (error) {
      toast.error('Check-in could not be completed', { description: error instanceof Error ? error.message : 'Review the comment and try again.' });
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Team Check-ins</h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
          Planned vs Actual review • {getWindowMessageForDate(currentDate)}
        </p>
      </div>

      <QuarterSelector selectedQuarter={selectedQuarter} activeQuarter={activeQuarter} onChange={setSelectedQuarter} />

      {!isWindowOpen && (
        <div style={{ padding: '14px 18px', marginBottom: '16px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#92400e', margin: '0 0 2px 0' }}>Manager check-in is outside the active window.</p>
          <p style={{ fontSize: '13px', color: '#a16207', margin: 0 }}>Switch the demo date to the selected quarter month before locking check-in comments.</p>
        </div>
      )}

      {/* Team Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {teamMembers.map((member) => {
          const memberSheet = goalSheets.find((s) => s.employeeId === member.id && s.cycleId === activeCycle?.id);
          const memberGoals = memberSheet ? goals.filter((g) => g.sheetId === memberSheet.id) : [];
          const existingCheckin = managerCheckins.find((c) => c.employeeId === member.id && c.quarter === selectedQuarter && c.cycleId === activeCycle?.id);

          return (
            <div key={member.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Member Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    {member.avatarInitials}
                  </span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 1px 0' }}>{member.name}</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                      {memberGoals.length} goals • {existingCheckin ? 'check-in complete' : 'comment pending'}
                    </p>
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                  background: existingCheckin ? '#f0fdf4' : '#fffbeb',
                  color: existingCheckin ? '#16a34a' : '#f59e0b',
                }}>{existingCheckin ? 'Locked' : 'Open'}</span>
              </div>

              {/* Goals Table */}
              <div style={{ background: '#fafbfc' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1.5fr 1.5fr 1fr', gap: '8px', padding: '10px 20px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={I.label}>Goal</span>
                  <span style={{ ...I.label, textAlign: 'right' }}>Planned</span>
                  <span style={{ ...I.label, textAlign: 'right' }}>Actual</span>
                  <span style={{ ...I.label, textAlign: 'right' }}>Score</span>
                  <span style={{ ...I.label, textAlign: 'right' }}>State</span>
                </div>
                {memberGoals.length === 0 ? (
                  <p style={{ padding: '16px 20px', fontSize: '13px', color: '#94a3b8', margin: 0 }}>No approved goals yet.</p>
                ) : (
                  memberGoals.map((goal, idx) => {
                    const update = quarterlyUpdates.find((u) => u.goalId === goal.id && u.quarter === selectedQuarter);
                    return (
                      <div key={goal.id} style={{
                        display: 'grid', gridTemplateColumns: '3fr 1.5fr 1.5fr 1.5fr 1fr', gap: '8px', alignItems: 'center',
                        padding: '10px 20px', borderBottom: idx < memberGoals.length - 1 ? '1px solid #f1f5f9' : 'none',
                      }}>
                        <span style={{ fontSize: '13px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</span>
                        <span style={{ fontSize: '13px', color: '#475569', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{goal.target}</span>
                        <span style={{ fontSize: '13px', color: '#475569', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{update?.actualAchievement ?? '—'}</span>
                        <span className={update?.computedScore != null ? getScoreColor(update.computedScore) : ''} style={{ fontSize: '13px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {update?.computedScore != null ? formatScore(update.computedScore) : '—'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'right' }}>{update ? PROGRESS_STATUS_CONFIG[update.status].label : '—'}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comment Section */}
              <div style={{ padding: '16px 20px' }}>
                {existingCheckin ? (
                  <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Manager Comment</p>
                    <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.5' }}>{existingCheckin.comment}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <textarea
                      value={comments[member.id] || ''}
                      onChange={(e) => setComments((prev) => ({ ...prev, [member.id]: e.target.value }))}
                      rows={2} placeholder="Document coaching discussion, blockers, and next actions..."
                      style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', color: '#0f172a', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: '1.5' }}
                    />
                    <button onClick={() => handleSaveComment(member.id)} disabled={!isWindowOpen}
                      style={{
                        height: '40px', padding: '0 18px', borderRadius: '10px', border: 'none', alignSelf: 'flex-end',
                        fontSize: '13px', fontWeight: 600, cursor: isWindowOpen ? 'pointer' : 'not-allowed',
                        background: isWindowOpen ? '#2563eb' : '#e2e8f0', color: isWindowOpen ? '#ffffff' : '#94a3b8',
                      }}>
                      Complete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuarterSelector({ selectedQuarter, activeQuarter, onChange }: {
  selectedQuarter: Quarter; activeQuarter: Quarter | null; onChange: (q: Quarter) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
      {QUARTERS.map((q) => (
        <button key={q} onClick={() => onChange(q)}
          style={{
            height: '38px', padding: '0 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            border: activeQuarter === q ? '1.5px solid #22c55e' : '1.5px solid transparent',
            background: selectedQuarter === q ? '#0f172a' : '#f1f5f9',
            color: selectedQuarter === q ? '#ffffff' : '#64748b',
            transition: 'all 150ms',
          }}>
          {q}
        </button>
      ))}
    </div>
  );
}
