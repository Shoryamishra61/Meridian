'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useDemoDateStore } from '@/stores/demo-date-store';
import { BUSINESS_RULES, STATUS_CONFIG, UOM_LABELS } from '@/lib/constants';
import { validateGoalSettingWindow } from '@/server/domain/goal-policy';
import { validateWeightage } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import GoalCreateDialog from '@/components/goals/GoalCreateDialog';
import WeightageTracker from '@/components/goals/WeightageTracker';
import CycleWindowsCard from '@/components/ui/CycleWindowsCard';
import { getSmartSuggestions, type GoalSuggestion } from '@/lib/ai-engine';
import confetti from 'canvas-confetti';
import { Bot, CheckCircle2, FileCheck2, Lock, Pencil, Plus, Scale, Send, Trash2 } from 'lucide-react';



export default function GoalsPageWrapper() {
  return (
    <Suspense fallback={<div className="animate-in p-8 text-[var(--text-secondary)]">Loading goals...</div>}>
      <GoalsPage />
    </Suspense>
  );
}

function GoalsPage() {
  const user = useAuthStore((s) => s.user)!;
  const { goalSheets, goals, cycles, thrustAreas, getOrCreateSheet, updateSheetStatus, deleteGoal, addGoal, addAuditLog } = useDataStore();
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
  const isPendingApproval = sheet?.status === 'PENDING_APPROVAL';
  const statusLabel = STATUS_CONFIG[sheet?.status as keyof typeof STATUS_CONFIG]?.label || sheet?.status || 'Draft';
  const statusChipClass = cn(
    'status-chip',
    sheet?.status === 'PENDING_APPROVAL' && 'status-chip-warning',
    sheet?.status === 'LOCKED' && 'status-chip-success',
    sheet?.status === 'RETURNED' && 'status-chip-danger',
    sheet?.status === 'DRAFT' && 'status-chip-neutral'
  );

  const [showCreateDialog, setShowCreateDialog] = useState(canEdit && searchParams.get('action') === 'new');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unsaved changes warning — prevent accidental navigation
  useEffect(() => {
    if (!canEdit || myGoals.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom message but still show prompt
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [canEdit, myGoals.length]);

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
    // BRD: goal creation and submission are restricted to the May window.
    const windowPolicy = validateGoalSettingWindow(currentDate);
    if (!windowPolicy.ok) {
      toast.error('Goal setting window is closed', { description: windowPolicy.message });
      return;
    }
    setShowSubmitConfirm(true);
  };

  const confirmSubmit = () => {
    if (!sheet || isSubmitting) return;
    setIsSubmitting(true);
    try {
      updateSheetStatus(sheet.id, 'PENDING_APPROVAL', { submittedAt: new Date() });
      addAuditLog({ entityType: 'goal_sheet', entityId: sheet.id, action: 'SUBMIT', fieldName: 'status', oldValue: { status: sheet.status }, newValue: { status: 'PENDING_APPROVAL' }, changedBy: user.id, ipAddress: null, userAgent: null });
      toast.success('Goal sheet submitted — awaiting manager review');
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#2563eb', '#10b981', '#f59e0b', '#6366f1'] });
      setShowSubmitConfirm(false);
    } catch (err) {
      toast.error('Failed to submit', { description: err instanceof Error ? err.message : 'Please retry or contact support (ERR-403)' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const autoBalance = () => {
    if (myGoals.length === 0) return;
    const perGoal = Math.floor(100 / myGoals.length);
    const remainder = 100 - perGoal * myGoals.length;
    myGoals.forEach((g, i) => {
      const w = Math.min(BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL, Math.max(BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL, perGoal + (i === 0 ? remainder : 0)));
      try { useDataStore.getState().updateGoal(g.id, { weightage: w }, { role: user.role }); } catch { /* skip */ }
    });
    toast.success('Weightages auto-balanced');
  };

  const aiSuggestions = useMemo(() =>
    getSmartSuggestions(user.department, myGoals, thrustAreas),
    [user.department, myGoals, thrustAreas]
  );

  const acceptAiGoal = (sg: GoalSuggestion) => {
    if (!sheetId || !canAddGoal) return;
    try {
      addGoal({ sheetId, thrustAreaId: sg.thrustArea, title: sg.title, description: sg.description, uomType: sg.uomType, target: sg.suggestedTarget, targetDate: null, weightage: Math.min(sg.suggestedWeightage, 100 - totalWeightage), isShared: false, sharedFromId: null, isOwner: true });
      toast.success(`Goal "${sg.title}" added — review before submitting`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add goal');
    }
  };

  // Cycle windows
  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">Employee workspace</p>
          <div className="app-page-title-row">
            <h1 style={{ margin: 0 }}>My Goals</h1>
            <span className={statusChipClass}>
              {statusLabel}
            </span>
          </div>
          <p className={cn('app-page-meta', goalCountColor)}>
            <span>{activeCycle?.name}</span>
            <span className="sep">·</span>
            <span>{myGoals.length}/{BUSINESS_RULES.MAX_GOALS_PER_CYCLE} goals</span>
            <span className="sep">·</span>
            <span>{totalWeightage}% allocated</span>
          </p>
        </div>
        <div className="app-page-actions">
          {canEdit && (
            <button onClick={autoBalance} disabled={myGoals.length === 0} className="btn-ghost">
              <Scale className="h-4 w-4" />
              Auto-balance
            </button>
          )}
          {canEdit && canAddGoal && (
            <button onClick={() => setShowCreateDialog(true)} className="btn-secondary">
              <Plus className="h-4 w-4" />
              Add goal
            </button>
          )}
          {!canEdit && (
            <button disabled className="btn-secondary" title="Goal sheet is locked while approval is pending">
              <Lock className="h-4 w-4" />
              Add goal locked
            </button>
          )}
          {canEdit && !canAddGoal && (
            <span className="badge badge-returned">
              Max 8 goals reached
            </span>
          )}
          <button onClick={handleSubmitClick} disabled={!canSubmit || !allValid} className="btn-primary">
            <Send className="h-4 w-4" />
            Submit for approval
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row" style={{ gap: '48px', alignItems: 'flex-start' }}>
        {/* Main content */}
        <div className="flex-1 min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {/* Status banner */}
          {sheet && sheet.status !== 'DRAFT' && (
            <div className={cn('card',
              sheet.status === 'LOCKED' && 'border-l-4 border-l-[var(--success)]',
              sheet.status === 'PENDING_APPROVAL' && 'border-l-4 border-l-[var(--warning)]',
              sheet.status === 'RETURNED' && 'border-l-4 border-l-[var(--danger)]')} style={{ padding: '16px 18px' }}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
                  sheet.status === 'PENDING_APPROVAL' && 'bg-[var(--warning-subtle)] text-[var(--warning)]',
                  sheet.status === 'LOCKED' && 'bg-[var(--success-subtle)] text-[var(--success)]',
                  sheet.status === 'RETURNED' && 'status-icon-danger'
                )}>
                  {sheet.status === 'PENDING_APPROVAL' ? <Lock className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[var(--text-primary)]">{statusLabel}</p>
                  {isPendingApproval && (
                    <p className="mt-1 text-[13px] leading-snug text-[var(--text-secondary)]">
                      Goal edits are locked while this sheet is with L1. Add, edit, and remove actions reopen if the manager returns it.
                    </p>
                  )}
                  {sheet.status === 'RETURNED' && sheet.returnedReason && (
                    <p className="mt-1 text-[13px] leading-snug text-[var(--text-secondary)]">{sheet.returnedReason}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Weightage bar */}
          <div className="card" style={{ padding: '18px' }}>
            <WeightageTracker goals={myGoals} />
          </div>

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
              <div className="app-section-header">
                <div className="title">
                  <h2>Goal sheet</h2>
                  <p>{canEdit ? 'Draft goals and keep weightage at exactly 100%.' : 'Submitted goals are read-only until manager action.'}</p>
                </div>
                <div className="actions">
                {canEdit && canAddGoal ? (
                  <button onClick={() => setShowCreateDialog(true)} className="btn-primary btn-sm">
                    <Plus className="h-4 w-4" />
                    Add goal
                  </button>
                ) : (
                  <span className={cn(
                    'inline-flex h-8 items-center gap-2 rounded-[var(--radius-full)] px-3 text-[12px] font-bold',
                    canEdit ? 'bg-[var(--danger-subtle)] text-[var(--danger)]' : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
                  )}>
                    {canEdit ? 'Max goals reached' : <><Lock className="h-3.5 w-3.5" /> Read-only</>}
                  </span>
                )}
                </div>
              </div>
              <div className="hidden md:block">
                <div className="app-table-scroll">
                  <table className="app-table goals-table">
                    <colgroup>
                      <col style={{ width: '52px' }} />
                      <col />
                      <col style={{ width: '124px' }} />
                      <col style={{ width: '92px' }} />
                      <col style={{ width: '96px' }} />
                      <col style={{ width: '96px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center' }}>#</th>
                        <th>Goal</th>
                        <th>UoM</th>
                        <th style={{ textAlign: 'right' }}>Target</th>
                        <th style={{ textAlign: 'right' }}>Weight</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myGoals.map((goal, i) => (
                        <tr key={goal.id}>
                          <td style={{ textAlign: 'center' }}>
                            <span className="goals-row-index">{i + 1}</span>
                          </td>
                          <td>
                            <div className="goals-title-cell">
                              <div className="goals-title-row">
                                {goal.isShared && !goal.isOwner && <Lock title="Shared goal - read-only" className="goals-lock h-3.5 w-3.5" />}
                                <p className="goals-title">{goal.title}</p>
                              </div>
                              <p className="goals-description">{goal.description || 'No description'}</p>
                              {goal.isShared && (
                                <span className="goals-shared-note">
                                  {goal.isOwner ? 'Shared owner' : 'Shared read-only'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="goals-uom-chip">
                              {UOM_LABELS[goal.uomType].split('(')[0].trim()}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{goal.target}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="goals-weight">{goal.weightage}%</span>
                          </td>
                          <td>
                            <div className="goals-action-cell">
                              {canEdit ? (
                                <>
                                  <button onClick={() => { setEditingGoalId(goal.id); setShowCreateDialog(true); }}
                                    disabled={goal.isShared && !goal.isOwner}
                                    className="goals-icon-button" title="Edit goal" aria-label={`Edit ${goal.title}`}>
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => { if (goal.isShared && !goal.isOwner) { toast.error('Cannot delete shared goal'); return; } deleteGoal(goal.id); toast('Goal removed'); }}
                                    disabled={goal.isShared && !goal.isOwner}
                                    className="goals-icon-button goals-icon-button-danger" title="Remove goal" aria-label={`Remove ${goal.title}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <span className="goals-submitted-chip">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Submitted
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {myGoals.map((goal, i) => (
                <div key={goal.id} className={cn('md:hidden', i > 0 && 'border-t border-[var(--border)]')}>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '7px', background: 'var(--bg-muted)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 800 }}>{i + 1}</span>
                          {goal.isShared && <span className="badge badge-active" style={{ height: '22px', padding: '0 8px', fontSize: '10px' }}>{goal.isOwner ? 'Shared owner' : 'Shared'}</span>}
                        </div>
                        <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35, margin: 0 }}>{goal.title}</p>
                      </div>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--brand)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{goal.weightage}%</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: canEdit ? '14px' : 0 }}>
                      <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-surface-hover)', minWidth: 0 }}>
                        <p className="label-sm" style={{ fontSize: '10px', marginBottom: '4px' }}>UoM</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>{UOM_LABELS[goal.uomType].split('(')[0].trim()}</p>
                      </div>
                      <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-surface-hover)' }}>
                        <p className="label-sm" style={{ fontSize: '10px', marginBottom: '4px' }}>Target</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{goal.target}</p>
                      </div>
                    </div>
                    {canEdit && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button onClick={() => { setEditingGoalId(goal.id); setShowCreateDialog(true); }}
                          disabled={goal.isShared && !goal.isOwner}
                          className="btn-secondary" style={{ height: '40px', padding: '0 12px' }}>Edit</button>
                        <button onClick={() => { if (goal.isShared && !goal.isOwner) { toast.error('Cannot delete shared goal'); return; } deleteGoal(goal.id); toast('Goal removed'); }}
                          disabled={goal.isShared && !goal.isOwner}
                          className="btn-ghost" style={{ height: '40px', padding: '0 12px', color: 'var(--danger)' }}>Remove</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Suggestions panel */}
          {showAiSuggestions && canEdit && aiSuggestions.length > 0 && (
            <div className="card" style={{ padding: '0', marginTop: '20px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>✨ Smart Goal Suggestions</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Based on your department and existing goals</p>
                </div>
                <button onClick={() => setShowAiSuggestions(false)}
                  className="btn-ghost" style={{ height: '32px' }}>
                  Dismiss
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {aiSuggestions.map((sg, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: i < aiSuggestions.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{sg.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>{sg.description}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge">{sg.suggestedWeightage}%</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Target: {sg.suggestedTarget}</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '4px 0 0', fontStyle: 'italic' }}>{sg.reasoning}</p>
                    </div>
                    <button onClick={() => acceptAiGoal(sg)} disabled={!canAddGoal}
                      className="btn-secondary" style={{ flexShrink: 0, marginLeft: '16px' }}>
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-full lg:w-[300px] shrink-0" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Validation panel */}
          <div className="card" style={{ padding: '18px' }}>
            <h2 style={{ marginBottom: '14px', fontSize: '16px', lineHeight: 1.25 }}>Submission Checklist</h2>
            <div className="app-checklist">
              {validations.map((v, i) => (
                <div key={i} className={cn('app-checklist-item', v.met && 'done')}>
                  <span className="app-checklist-bullet">{v.met ? '✓' : ''}</span>
                  <span>{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="card" style={{ padding: '18px' }}>
            <div className="flex items-center justify-between" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
              <span className="label-sm">Remaining</span>
              <span className={cn('text-lg font-semibold tabular-nums',
                totalWeightage === 0 ? 'text-[var(--warning)]' : totalWeightage === 100 ? 'text-[var(--success)]' : 'text-[var(--text-primary)]')}>
                {100 - totalWeightage}%
              </span>
            </div>
            <div className="flex items-center justify-between" style={{ paddingTop: '16px' }}>
              <span className="label-sm">Manager State</span>
              <span className={statusChipClass}>
                {sheet?.status === 'PENDING_APPROVAL' ? 'Pending' : STATUS_CONFIG[sheet?.status as keyof typeof STATUS_CONFIG]?.label || 'Draft'}
              </span>
            </div>
          </div>

          <CycleWindowsCard currentDate={currentDate} compact />

          {canEdit && (
            <button onClick={() => setShowAiSuggestions(!showAiSuggestions)}
              className="btn-secondary w-full">
              <Bot className="h-4 w-4" />
              AI Goal Suggestions
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
