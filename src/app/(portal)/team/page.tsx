/**
 * Meridian - Team Goals (Manager)
 * Clean enterprise table UI. Inline editing. Approve & Lock, or Return.
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { DEMO_ACCOUNTS, STATUS_CONFIG, UOM_LABELS, BUSINESS_RULES } from '@/lib/constants';
import { validateWeightage } from '@/lib/calculations';
import { validateApprovalRequest } from '@/server/domain/goal-policy';
import type { Goal } from '@/types';
import WeightageTracker from '@/components/goals/WeightageTracker';

// Pure inline style helpers - no Tailwind classes to avoid CSS variable conflicts
const TH: React.CSSProperties = { padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' };
const TD: React.CSSProperties = { padding: '16px 20px' };

const badgeStyle = (status: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, lineHeight: '1',
  ...(status === 'PENDING_APPROVAL' ? { background: 'var(--warning-bg)', color: 'var(--warning)' }
    : status === 'LOCKED' ? { background: 'var(--success-bg)', color: 'var(--success)' }
    : status === 'RETURNED' ? { background: 'var(--danger-bg)', color: 'var(--danger)' }
    : status === 'DRAFT' ? { background: 'var(--bg-muted)', color: 'var(--text-secondary)' }
    : { background: 'var(--bg-muted)', color: 'var(--text-tertiary)' }),
});

const badgeLabel = (s: string) =>
  s === 'PENDING_APPROVAL' ? 'Pending Review' : s === 'LOCKED' ? 'Approved' : s === 'DRAFT' ? 'Draft' : s === 'RETURNED' ? 'Returned' : 'Not Started';

export default function TeamPage() {
  const user = useAuthStore((s) => s.user)!;
  const { goalSheets, goals, updateSheetStatus, updateGoal, addAuditLog, addNotification } = useDataStore();

  const teamMembers = DEMO_ACCOUNTS.filter((acc) => acc.managerId === user.id);
  const teamSheets = goalSheets.filter((s) => teamMembers.some((m) => m.id === s.employeeId));

  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [editingGoals, setEditingGoals] = useState<Record<string, { target?: number; weightage?: number }>>({});
  const [isEditing, setIsEditing] = useState(false);

  const selectedSheet = selectedSheetId ? goalSheets.find((s) => s.id === selectedSheetId) : null;
  const selectedEmployee = selectedSheet ? teamMembers.find((m) => m.id === selectedSheet.employeeId) : null;
  const sheetGoals = selectedSheet ? goals.filter((g) => g.sheetId === selectedSheet.id).sort((a, b) => a.displayOrder - b.displayOrder) : [];

  const startEditing = () => {
    const edits: Record<string, { target?: number; weightage?: number }> = {};
    sheetGoals.forEach((g) => { edits[g.id] = { target: g.target, weightage: g.weightage }; });
    setEditingGoals(edits);
    setIsEditing(true);
  };

  const cancelEditing = () => { setEditingGoals({}); setIsEditing(false); };

  const updateEditValue = (goalId: string, field: 'target' | 'weightage', value: number) => {
    setEditingGoals((prev) => ({ ...prev, [goalId]: { ...prev[goalId], [field]: value } }));
  };

  const applyEdits = () => {
    const editedGoals = sheetGoals.map((g) => ({
      ...g,
      target: editingGoals[g.id]?.target ?? g.target,
      weightage: editingGoals[g.id]?.weightage ?? g.weightage,
    }));
    const validation = validateWeightage(editedGoals);
    if (!validation.isValid) { toast.error('Validation failed', { description: validation.message }); return; }
    const invalidGoal = editedGoals.find((g) => g.weightage < BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL);
    if (invalidGoal) { toast.error(`"${invalidGoal.title}" below min ${BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}%`); return; }

    try {
      Object.entries(editingGoals)
        .sort(([goalA, editsA], [goalB, editsB]) => {
          const originalA = sheetGoals.find((g) => g.id === goalA);
          const originalB = sheetGoals.find((g) => g.id === goalB);
          const deltaA = (editsA.weightage ?? originalA?.weightage ?? 0) - (originalA?.weightage ?? 0);
          const deltaB = (editsB.weightage ?? originalB?.weightage ?? 0) - (originalB?.weightage ?? 0);
          return deltaA - deltaB;
        })
        .forEach(([goalId, edits]) => {
        const original = sheetGoals.find((g) => g.id === goalId);
        if (!original) return;
        const changes: Partial<Goal> = {};
        if (edits.target !== undefined && edits.target !== original.target) {
          changes.target = edits.target;
          addAuditLog({ entityType: 'goal', entityId: goalId, action: 'MANAGER_EDIT', fieldName: 'target', oldValue: { target: original.target }, newValue: { target: edits.target }, changedBy: user.id, ipAddress: null, userAgent: null });
        }
        if (edits.weightage !== undefined && edits.weightage !== original.weightage) {
          changes.weightage = edits.weightage;
          addAuditLog({ entityType: 'goal', entityId: goalId, action: 'MANAGER_EDIT', fieldName: 'weightage', oldValue: { weightage: original.weightage }, newValue: { weightage: edits.weightage }, changedBy: user.id, ipAddress: null, userAgent: null });
        }
        if (Object.keys(changes).length > 0) updateGoal(goalId, changes, { role: user.role });
      });
      setIsEditing(false);
      setEditingGoals({});
      toast.success('Changes saved');
    } catch (error) {
      toast.error('Inline edits could not be saved', {
        description: error instanceof Error ? error.message : 'Review target and weightage values.',
      });
    }
  };

  const handleApprove = (sheetToApprove = selectedSheet) => {
    if (!sheetToApprove) return;
    const goalsToApprove = goals.filter((goal) => goal.sheetId === sheetToApprove.id).sort((a, b) => a.displayOrder - b.displayOrder);
    const employeeToApprove = teamMembers.find((member) => member.id === sheetToApprove.employeeId);
    const validation = validateApprovalRequest(sheetToApprove, goalsToApprove);
    if (!validation.ok) { toast.error('Cannot approve', { description: validation.message }); return; }
    try {
      updateSheetStatus(sheetToApprove.id, 'LOCKED', { approvedAt: new Date(), approvedBy: user.id, lockedAt: new Date() });
    } catch (error) {
      toast.error('Cannot approve', {
        description: error instanceof Error ? error.message : 'Review the goal sheet and try again.',
      });
      return;
    }
    addAuditLog({ entityType: 'goal_sheet', entityId: sheetToApprove.id, action: 'APPROVE', fieldName: 'status', oldValue: { status: sheetToApprove.status }, newValue: { status: 'LOCKED' }, changedBy: user.id, ipAddress: null, userAgent: null });
    addNotification({
      type: 'GOAL_APPROVED',
      recipientId: sheetToApprove.employeeId,
      title: 'Goals approved and locked',
      message: `${user.name} approved your goal sheet. You can now enter achievements during active check-in windows.`,
      deepLink: '/goals',
    });
    toast.success(`${employeeToApprove?.name || selectedEmployee?.name}'s goals approved and locked`);
    setSelectedSheetId(null);
  };

  const handleReturn = () => {
    if (!selectedSheet || !returnReason.trim()) return;
    updateSheetStatus(selectedSheet.id, 'RETURNED', { returnedAt: new Date(), returnedReason: returnReason.trim() });
    addAuditLog({ entityType: 'goal_sheet', entityId: selectedSheet.id, action: 'RETURN', fieldName: 'status', oldValue: { status: selectedSheet.status }, newValue: { status: 'RETURNED', reason: returnReason.trim() }, changedBy: user.id, ipAddress: null, userAgent: null });
    addNotification({
      type: 'GOAL_RETURNED',
      recipientId: selectedSheet.employeeId,
      title: 'Goals returned for rework',
      message: `${user.name} returned your goal sheet: ${returnReason.trim()}`,
      deepLink: '/goals',
    });
    toast('Goals returned');
    setShowReturnDialog(false);
    setReturnReason('');
    setSelectedSheetId(null);
  };

  // ─── Detail View ──────────────────────────────────────────────
  if (selectedSheet && selectedEmployee) {
    const statusLabel = STATUS_CONFIG[selectedSheet.status as keyof typeof STATUS_CONFIG]?.label || selectedSheet.status;
    return (
      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => { setSelectedSheetId(null); cancelEditing(); }}
            style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brand-light)', color: 'var(--brand)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{selectedEmployee.avatarInitials}</div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{selectedEmployee.name}</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{selectedEmployee.department} · {statusLabel}</p>
              </div>
            </div>
          </div>
          {selectedSheet.status === 'PENDING_APPROVAL' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {!isEditing ? (
                <button onClick={startEditing} style={{ height: '36px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}>Edit Inline</button>
              ) : (
                <>
                  <button onClick={cancelEditing} style={{ height: '36px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={applyEdits} style={{ height: '36px', padding: '0 14px', borderRadius: '8px', border: '1px solid #2563eb', background: 'var(--brand-light)', fontSize: '13px', fontWeight: 600, color: 'var(--brand)', cursor: 'pointer' }}>Save Edits</button>
                </>
              )}
              <button onClick={() => setShowReturnDialog(true)} style={{ height: '36px', padding: '0 14px', borderRadius: '8px', background: 'var(--danger-bg)', border: '1px solid #fecaca', fontSize: '13px', fontWeight: 600, color: 'var(--danger)', cursor: 'pointer' }}>Return</button>
              <button onClick={() => handleApprove()} disabled={isEditing} style={{ height: '36px', padding: '0 16px', borderRadius: '8px', background: isEditing ? '#94a3b8' : '#10b981', border: 'none', fontSize: '13px', fontWeight: 600, color: 'var(--text-inverse)', cursor: isEditing ? 'not-allowed' : 'pointer', opacity: isEditing ? 0.5 : 1 }}>Approve & Lock</button>
            </div>
          )}
        </div>

        <WeightageTracker
          goals={isEditing
            ? sheetGoals.map((g) => ({ ...g, target: editingGoals[g.id]?.target ?? g.target, weightage: editingGoals[g.id]?.weightage ?? g.weightage }))
            : sheetGoals}
        />

        {/* Goals table */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-canvas)' }}>
                  <th style={{ ...TH, width: '48px', textAlign: 'center' }}>#</th>
                  <th style={TH}>Goal</th>
                  <th style={TH}>UoM</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Target</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Weight</th>
                </tr>
              </thead>
              <tbody>
                {sheetGoals.map((goal, i) => (
                  <tr key={goal.id} style={{ borderBottom: i < sheetGoals.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                    <td style={{ ...TD, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>{i + 1}</td>
                    <td style={TD}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>{goal.title}</p>
                      {goal.description && <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.description}</p>}
                    </td>
                    <td style={{ ...TD, fontSize: '13px', color: 'var(--text-secondary)' }}>{UOM_LABELS[goal.uomType].split('(')[0].trim()}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>
                      {isEditing ? (
                        <input type="number" value={editingGoals[goal.id]?.target ?? goal.target} onChange={(e) => updateEditValue(goal.id, 'target', Number(e.target.value))}
                          style={{ width: '80px', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'var(--bg-canvas)', fontSize: '13px', textAlign: 'right', outline: 'none' }} />
                      ) : (
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{goal.target}</span>
                      )}
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }}>
                      {isEditing ? (
                        <input type="number" value={editingGoals[goal.id]?.weightage ?? goal.weightage} onChange={(e) => updateEditValue(goal.id, 'weightage', Number(e.target.value))}
                          min={BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}
                          style={{ width: '64px', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'var(--bg-canvas)', fontSize: '13px', textAlign: 'right', outline: 'none' }} />
                      ) : (
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{goal.weightage}%</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Return Dialog */}
        {showReturnDialog && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowReturnDialog(false)}>
            <div style={{ width: '100%', maxWidth: '440px', margin: '0 16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>Return for Rework</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>Explain what needs to change so {selectedEmployee.name} can revise their goals.</p>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Weightage for Q2 targets needs rebalancing..."
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button onClick={() => { setShowReturnDialog(false); setReturnReason(''); }} style={{ height: '36px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleReturn} disabled={!returnReason.trim()} style={{ height: '36px', padding: '0 16px', borderRadius: '8px', background: returnReason.trim() ? '#ef4444' : '#fca5a5', border: 'none', fontSize: '13px', fontWeight: 600, color: 'var(--text-inverse)', cursor: returnReason.trim() ? 'pointer' : 'not-allowed' }}>Return Goals</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Team List ────────────────────────────────────────────────
  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">Manager workspace</p>
          <h1 style={{ margin: '0 0 6px 0' }}>Team Goals</h1>
          <p className="app-page-meta">Review and approve your team&apos;s goal sheets.</p>
        </div>
      </header>

      <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-canvas)' }}>
                <th style={TH}>Employee</th>
                <th style={TH}>Department</th>
                <th style={{ ...TH, textAlign: 'center' }}>Goals</th>
                <th style={{ ...TH, textAlign: 'center' }}>Status</th>
                <th style={{ ...TH, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, i) => {
                const sheet = teamSheets.find((s) => s.employeeId === member.id);
                const memberGoals = sheet ? goals.filter((g) => g.sheetId === sheet.id) : [];
                const totalW = memberGoals.reduce((sum, g) => sum + g.weightage, 0);
                const status = sheet?.status || 'NOT_STARTED';
                const canAct = status === 'PENDING_APPROVAL';

                return (
                  <tr
                    key={member.id}
                    style={{ borderBottom: i < teamMembers.length - 1 ? '1px solid #e2e8f0' : 'none', cursor: sheet ? 'pointer' : 'default', opacity: sheet ? 1 : 0.5 }}
                    className="hover:bg-[var(--bg-surface-hover)] transition-colors"
                    onClick={() => sheet && setSelectedSheetId(sheet.id)}
                  >
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--brand-light)', color: 'var(--brand)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {member.avatarInitials}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{member.name}</span>
                      </div>
                    </td>
                    <td style={{ ...TD, fontSize: '14px', color: 'var(--text-secondary)' }}>{member.department}</td>
                    <td style={{ ...TD, textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {memberGoals.length > 0 ? (
                        <>{memberGoals.length} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '2px' }}>({totalW}%)</span></>
                      ) : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span style={badgeStyle(status)}>{badgeLabel(status)}</span>
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => sheet && setSelectedSheetId(sheet.id)}
                          disabled={!sheet}
                          style={{ height: '32px', padding: '0 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', cursor: sheet ? 'pointer' : 'not-allowed', opacity: sheet ? 1 : 0.4 }}
                        >Review</button>
                        <button
                          onClick={() => sheet && handleApprove(sheet)}
                          disabled={!canAct}
                          style={{ height: '32px', padding: '0 14px', borderRadius: '6px', border: 'none', background: canAct ? '#10b981' : '#e2e8f0', fontSize: '12px', fontWeight: 600, color: canAct ? '#fff' : '#94a3b8', cursor: canAct ? 'pointer' : 'not-allowed' }}
                        >Approve</button>
                        <button
                          onClick={() => { if (!sheet) return; setSelectedSheetId(sheet.id); setShowReturnDialog(true); }}
                          disabled={!canAct}
                          style={{ height: '32px', padding: '0 14px', borderRadius: '6px', border: 'none', background: canAct ? '#fee2e2' : '#f1f5f9', fontSize: '12px', fontWeight: 600, color: canAct ? '#dc2626' : '#94a3b8', cursor: canAct ? 'pointer' : 'not-allowed' }}
                        >Return</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
