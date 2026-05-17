'use client';

import { useState, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useDemoDateStore } from '@/stores/demo-date-store';
import { BUSINESS_RULES, STATUS_CONFIG, UOM_LABELS, DEFAULT_CYCLE_WINDOWS } from '@/lib/constants';
import { validateWeightage } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import GoalCreateDialog from '@/components/goals/GoalCreateDialog';
import WeightageTracker from '@/components/goals/WeightageTracker';
import confetti from 'canvas-confetti';

const AI_SUGGESTIONS = [
  { title: 'Increase quarterly revenue by 15%', type: 'Revenue', uom: 'NUMERIC_MIN' as const, target: 15, weightage: 30, thrust: 'ta-1' },
  { title: 'Reduce operational costs by 10%', type: 'Cost', uom: 'NUMERIC_MAX' as const, target: 10, weightage: 35, thrust: 'ta-6' },
  { title: 'Achieve 95% customer satisfaction score', type: 'Quality', uom: 'PERCENTAGE_MIN' as const, target: 95, weightage: 35, thrust: 'ta-3' },
];

export default function GoalsPageWrapper() {
  return (
    <Suspense fallback={<div className="animate-in p-8 text-[var(--text-secondary)]">Loading goals...</div>}>
      <GoalsPage />
    </Suspense>
  );
}

function GoalsPage() {
  const user = useAuthStore((s) => s.user)!;
  const { goalSheets, goals, cycles, getOrCreateSheet, updateSheetStatus, deleteGoal, addGoal, addAuditLog } = useDataStore();
  const getCurrentDate = useDemoDateStore((s) => s.getCurrentDate);
  const searchParams = useSearchParams();
  const currentDate = getCurrentDate();

  const activeCycle = cycles.find((c) => c.isActive);
  const sheetId = useMemo(() => {
    if (!activeCycle) return null;
    return getOrCreateSheet(user.id, activeCycle.id).id;
  }, [activeCycle, user.id, getOrCreateSheet]);

  const sheet = goalSheets.find((s) => s.id === sheetId);
  const myGoals = goals.filter((g) => g.sheetId === sheetId).sort((a, b) => a.displayOrder - b.displayOrder);
  const totalWeightage = myGoals.reduce((sum, g) => sum + g.weightage, 0);
  const canAddGoal = myGoals.length < BUSINESS_RULES.MAX_GOALS_PER_CYCLE;
  const canSubmit = totalWeightage === 100 && (sheet?.status === 'DRAFT' || sheet?.status === 'RETURNED') && myGoals.length > 0;
  const canEdit = sheet?.status === 'DRAFT' || sheet?.status === 'RETURNED';
  const goalCountColor = myGoals.length >= 8 ? 'text-[var(--danger)]' : myGoals.length >= 6 ? 'text-[var(--warning)]' : 'text-[var(--text-secondary)]';

  const [showCreateDialog, setShowCreateDialog] = useState(searchParams.get('action') === 'new');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);

  // Validation checklist — reactive
  const validations = [
    { label: 'At least 1 goal created', met: myGoals.length > 0 },
    { label: 'Total weightage = 100%', met: totalWeightage === 100 },
    { label: `Each goal ≥ ${BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}%`, met: myGoals.length > 0 && myGoals.every((g) => g.weightage >= BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL) },
    { label: `Each goal ≤ ${BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL}%`, met: myGoals.length > 0 && myGoals.every((g) => g.weightage <= BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL) },
    { label: 'Goal type selected per goal', met: myGoals.length > 0 && myGoals.every((g) => g.thrustAreaId) },
  ];
  const allValid = validations.every((v) => v.met);

  const handleSubmitClick = () => {
    if (!canSubmit) return;
    const v = validateWeightage(myGoals);
    if (!v.isValid) { toast.error('Cannot submit', { description: v.message }); return; }
    const bad = myGoals.find((g) => g.weightage < BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL);
    if (bad) { toast.error(`"${bad.title}" has ${bad.weightage}% — min is ${BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}%`); return; }
    setShowSubmitConfirm(true);
  };

  const confirmSubmit = () => {
    if (!sheet) return;
    try {
      updateSheetStatus(sheet.id, 'PENDING_APPROVAL', { submittedAt: new Date() });
      addAuditLog({ entityType: 'goal_sheet', entityId: sheet.id, action: 'SUBMIT', fieldName: 'status', oldValue: { status: sheet.status }, newValue: { status: 'PENDING_APPROVAL' }, changedBy: user.id, ipAddress: null, userAgent: null });
      toast.success('Goal sheet submitted — awaiting manager review');
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#2563eb', '#10b981', '#f59e0b', '#6366f1'] });
      setShowSubmitConfirm(false);
    } catch (err) {
      toast.error('Failed to submit', { description: err instanceof Error ? err.message : 'Please retry or contact support (ERR-403)' });
    }
  };

  const autoBalance = () => {
    if (myGoals.length === 0) return;
    const perGoal = Math.floor(100 / myGoals.length);
    const remainder = 100 - perGoal * myGoals.length;
    myGoals.forEach((g, i) => {
      const w = Math.min(BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL, Math.max(BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL, perGoal + (i === 0 ? remainder : 0)));
      try { useDataStore.getState().updateGoal(g.id, { weightage: w }); } catch { /* skip */ }
    });
    toast.success('Weightages auto-balanced');
  };

  const acceptAiGoal = (sg: typeof AI_SUGGESTIONS[0]) => {
    if (!sheetId || !canAddGoal) return;
    try {
      addGoal({ sheetId, thrustAreaId: sg.thrust, title: sg.title, description: null, uomType: sg.uom, target: sg.target, targetDate: null, weightage: Math.min(sg.weightage, 100 - totalWeightage), isShared: false, sharedFromId: null, isOwner: true });
      toast.success(`AI goal "${sg.title}" added — review before submitting`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add goal');
    }
  };

  // Cycle windows
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 style={{ marginBottom: '6px' }}>My Goals</h1>
          <p className={cn('text-[14px]', goalCountColor)}>
            {activeCycle?.name} · Goals: {myGoals.length}/{BUSINESS_RULES.MAX_GOALS_PER_CYCLE}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button onClick={autoBalance} disabled={myGoals.length === 0} className="btn-ghost">
              Auto-balance
            </button>
          )}
          {canEdit && canAddGoal && (
            <button onClick={() => setShowCreateDialog(true)} className="btn-secondary">
              Add goal
            </button>
          )}
          {canEdit && !canAddGoal && (
            <span className="badge badge-returned">
              Max 8 goals reached
            </span>
          )}
          <button onClick={handleSubmitClick} disabled={!canSubmit || !allValid} className="btn-primary">
            Submit for approval
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row" style={{ gap: '32px' }}>
        {/* Main content */}
        <div className="flex-1 min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status banner */}
          {sheet && sheet.status !== 'DRAFT' && (
            <div className={cn('card text-[14px] font-medium',
              sheet.status === 'LOCKED' && 'border-l-4 border-l-[var(--success)]',
              sheet.status === 'PENDING_APPROVAL' && 'border-l-4 border-l-[var(--warning)]',
              sheet.status === 'RETURNED' && 'border-l-4 border-l-[var(--danger)]')}>
              <span>{STATUS_CONFIG[sheet.status as keyof typeof STATUS_CONFIG]?.label || sheet.status}</span>
              {sheet.status === 'RETURNED' && sheet.returnedReason && (
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 font-normal">{sheet.returnedReason}</p>
              )}
            </div>
          )}

          {/* Weightage bar */}
          <div><WeightageTracker goals={myGoals} /></div>

          {/* Deficit/surplus message */}
          {myGoals.length > 0 && totalWeightage !== 100 && (
            <div className={cn('rounded-[var(--radius-md)] text-[13px] font-medium',
              totalWeightage < 100 ? 'bg-[var(--warning-subtle)] text-[var(--warning)]' : 'bg-[var(--danger-subtle)] text-[var(--danger)]')}>
              {totalWeightage < 100 ? `You are ${100 - totalWeightage}% short — adjust weightages before submitting` : `Over by ${totalWeightage - 100}% — reduce weightages to submit`}
            </div>
          )}

          {/* Empty state */}
          {myGoals.length === 0 ? (
            <div className="card text-center" style={{ padding: '48px 32px' }}>
              <p className="text-lg font-semibold" style={{ marginBottom: '8px' }}>No goals drafted yet</p>
              <p className="text-[14px] text-[var(--text-secondary)]" style={{ marginBottom: '24px' }}>Create up to {BUSINESS_RULES.MAX_GOALS_PER_CYCLE} goals with a total weightage of 100%.</p>
              <div className="w-full h-2 bg-[var(--bg-interactive)] rounded-full" style={{ marginBottom: '12px' }}><div className="h-full rounded-full bg-[var(--bg-interactive)]" style={{ width: '0%' }} /></div>
              <p className="text-[12px] text-[var(--warning)]" style={{ marginBottom: '24px' }}>0 / 100% weightage allocated</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => setShowCreateDialog(true)} className="btn-primary shadow-lg shadow-[var(--brand-muted)]">
                  + Add First Goal
                </button>
                <button onClick={() => setShowAiSuggestions(!showAiSuggestions)} className="btn-secondary">
                  AI Suggestions
                </button>
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-[var(--border)]">
                <span className="label-sm col-span-1">#</span>
                <span className="label-sm col-span-5">Goal</span>
                <span className="label-sm col-span-2">UoM</span>
                <span className="label-sm col-span-1 text-right">Target</span>
                <span className="label-sm col-span-1 text-right">Weight</span>
                <span className="label-sm col-span-2 text-right">Actions</span>
              </div>
              {myGoals.map((goal, i) => (
                <div key={goal.id} className={cn('grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors', i > 0 && 'border-t border-[var(--border)]')}>
                  <span className="col-span-1 text-[12px] text-[var(--text-tertiary)] tabular-nums">{i + 1}</span>
                  <div className="col-span-5 min-w-0">
                    <p className="text-[13px] font-medium truncate">{goal.title}</p>
                    {goal.isShared && <span className="text-[11px] text-[var(--text-tertiary)]">Shared{goal.isOwner ? ' (owner)' : ''}</span>}
                  </div>
                  <span className="col-span-2 text-[12px] text-[var(--text-secondary)]">{UOM_LABELS[goal.uomType].split('(')[0].trim()}</span>
                  <span className="col-span-1 text-[12px] text-[var(--text-secondary)] text-right tabular-nums">{goal.target}</span>
                  <span className="col-span-1 text-[13px] font-semibold text-right tabular-nums">{goal.weightage}%</span>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    {canEdit && (
                      <>
                        <button onClick={() => { setEditingGoalId(goal.id); setShowCreateDialog(true); }}
                          disabled={goal.isShared && !goal.isOwner}
                          className="h-7 px-2 rounded-[var(--radius-sm)] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-interactive)] transition-colors disabled:opacity-30">Edit</button>
                        <button onClick={() => { if (goal.isShared && !goal.isOwner) { toast.error('Cannot delete shared goal'); return; } deleteGoal(goal.id); toast('Goal removed'); }}
                          disabled={goal.isShared && !goal.isOwner}
                          className="h-7 px-2 rounded-[var(--radius-sm)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors disabled:opacity-30">Remove</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Suggestions panel */}
          {showAiSuggestions && canEdit && (
            <div className="card" style={{ padding: '0', marginTop: '20px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px 0' }}>✨ AI Suggested Goals</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Review before submitting — these are templates</p>
                </div>
                <button onClick={() => setShowAiSuggestions(false)}
                  style={{ height: '32px', padding: '0 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                  Dismiss
                </button>
              </div>
              {/* Suggestions */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {AI_SUGGESTIONS.map((sg, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: i < AI_SUGGESTIONS.length - 1 ? '1px solid #f1f5f9' : 'none',
                    transition: 'background 150ms',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>{sg.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                          background: sg.type === 'Revenue' ? '#eff6ff' : sg.type === 'Cost' ? '#fefce8' : '#f0fdf4',
                          color: sg.type === 'Revenue' ? '#2563eb' : sg.type === 'Cost' ? '#ca8a04' : '#16a34a',
                        }}>{sg.type}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{sg.weightage}%</span>
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>·</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Target: {sg.target}</span>
                      </div>
                    </div>
                    <button onClick={() => acceptAiGoal(sg)} disabled={!canAddGoal}
                      style={{
                        height: '34px', padding: '0 16px', borderRadius: '8px', border: '1.5px solid #2563eb',
                        background: '#ffffff', cursor: canAddGoal ? 'pointer' : 'not-allowed',
                        fontSize: '13px', fontWeight: 600, color: '#2563eb', flexShrink: 0, marginLeft: '16px',
                        opacity: canAddGoal ? 1 : 0.3,
                        transition: 'all 150ms',
                      }}>
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-full lg:w-[280px] shrink-0" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Validation panel */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ marginBottom: '20px' }}>Submission Checklist</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {validations.map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0',
                    v.met ? 'bg-[var(--success)] text-white' : 'border-2 border-[var(--border-strong)]')}>
                    {v.met ? '✓' : ''}
                  </span>
                  <span className={cn('text-[14px]', v.met ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]')}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="flex items-center justify-between" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
              <span className="label-sm">Remaining</span>
              <span className={cn('text-lg font-semibold tabular-nums',
                totalWeightage === 0 ? 'text-[var(--warning)]' : totalWeightage === 100 ? 'text-[var(--success)]' : 'text-[var(--text-primary)]')}>
                {100 - totalWeightage}%
              </span>
            </div>
            <div className="flex items-center justify-between" style={{ paddingTop: '16px' }}>
              <span className="label-sm">Manager State</span>
              <span className={cn('px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-medium',
                sheet?.status === 'DRAFT' && 'bg-[var(--bg-muted)] text-[var(--text-tertiary)]',
                sheet?.status === 'PENDING_APPROVAL' && 'bg-[var(--warning-subtle)] text-[var(--warning)]',
                sheet?.status === 'LOCKED' && 'bg-[var(--success-subtle)] text-[var(--success)]',
                sheet?.status === 'RETURNED' && 'bg-[var(--danger-subtle)] text-[var(--danger)]',
              )}>
                {sheet?.status === 'PENDING_APPROVAL' ? 'Pending' : STATUS_CONFIG[sheet?.status as keyof typeof STATUS_CONFIG]?.label || 'Draft'}
              </span>
            </div>
          </div>

          {/* Cycle Windows */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>Cycle Windows</h2>
            <div>
              {DEFAULT_CYCLE_WINDOWS.map((w) => {
                const opens = new Date(w.opensAt), closes = new Date(w.closesAt);
                const isActive = currentDate >= opens && currentDate <= closes;
                const isPast = currentDate > closes;
                const isFuture = currentDate < opens;
                const daysUntil = isFuture ? Math.ceil((opens.getTime() - currentDate.getTime()) / 86400000) : 0;
                return (
                  <div key={w.name} className={cn('flex items-center justify-between border-b border-[var(--border)] last:border-b-0',
                    isActive && 'bg-[var(--brand-muted)] -mx-2 px-2 rounded-md border-b-0')} style={{ padding: '10px 0' }}>
                    <span className={cn('text-[13px]', isActive ? 'font-semibold text-[var(--brand)]' : isPast ? 'text-[var(--text-disabled)]' : 'text-[var(--text-secondary)]')}>
                      {w.name}
                    </span>
                    {isActive && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--brand)] text-white">Active</span>}
                    {isPast && <span className="text-[11px] text-[var(--text-disabled)]">Closed</span>}
                    {isFuture && <span className="text-[11px] text-[var(--text-tertiary)]">{daysUntil}d</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {canEdit && (
            <button onClick={() => setShowAiSuggestions(!showAiSuggestions)}
              className="btn-secondary w-full">
              ✨ AI Goal Suggestions
            </button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && createPortal(
        <div className="modal-overlay" onClick={() => setShowSubmitConfirm(false)}>
          <div className="modal-panel" style={{ maxWidth: '420px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[14px] font-semibold mb-4">Confirm Submission</h3>
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-secondary)]">Goals</span>
                <span className="font-medium">{myGoals.length}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-secondary)]">Total Weightage</span>
                <span className="font-semibold text-[var(--success)]">{totalWeightage}%</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-secondary)]">Cycle</span>
                <span className="font-medium">{activeCycle?.name}</span>
              </div>
              <hr className="border-[var(--border)]" />
              <div className="space-y-1">
                {myGoals.map((g) => (
                  <div key={g.id} className="flex justify-between text-[12px]">
                    <span className="text-[var(--text-secondary)] truncate mr-2">{g.title}</span>
                    <span className="font-medium tabular-nums flex-shrink-0">{g.weightage}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSubmitConfirm(false)}
                className="h-8 px-3 rounded-[var(--radius-md)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors">Cancel</button>
              <button onClick={confirmSubmit}
                className="h-8 px-4 rounded-[var(--radius-md)] bg-[var(--brand)] text-white text-[13px] font-medium hover:bg-[var(--brand-hover)] transition-colors">Confirm &amp; Submit</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showCreateDialog && (
        <GoalCreateDialog sheetId={sheetId!} editGoalId={editingGoalId} existingGoals={myGoals}
          onClose={() => { setShowCreateDialog(false); setEditingGoalId(null); }} />
      )}
    </div>
  );
}
