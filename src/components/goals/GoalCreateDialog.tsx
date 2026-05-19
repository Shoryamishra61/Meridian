/**
 * Meridian — Goal Create/Edit Dialog
 * BRD-enforced: min 10%, max 40%, integer-only weightage, live remaining pool.
 * Shared goal recipients can only edit weightage.
 * ALL styling is inline to guarantee rendering.
 */

'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { BUSINESS_RULES, UOM_LABELS, UOM_DESCRIPTIONS } from '@/lib/constants';
import type { Goal } from '@/types';
import type { UoMType } from '@/lib/constants';
import { autoTagThrustArea, scoreGoalQuality, detectGoalOverlap, recommendWeightage } from '@/lib/ai-engine';
import { sanitizeTextInput } from '@/lib/sanitize';

interface GoalCreateDialogProps {
  sheetId: string;
  editGoalId: string | null;
  existingGoals: Goal[];
  onClose: () => void;
}

const GOAL_TYPE_CHIPS = [
  { id: 'revenue', label: 'Revenue', desc: 'Financial targets, sales KPIs', uoms: ['NUMERIC_MIN', 'PERCENTAGE_MIN'] as UoMType[] },
  { id: 'cost', label: 'Cost', desc: 'Savings, efficiency, expense reduction', uoms: ['NUMERIC_MAX', 'PERCENTAGE_MAX'] as UoMType[] },
  { id: 'quality', label: 'Quality', desc: 'NPS, delivery accuracy, compliance', uoms: ['ZERO_BASED', 'TIMELINE'] as UoMType[] },
];

/* ── Shared inline style objects ── */
const S = {
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' } as React.CSSProperties,
  required: { color: 'var(--danger)', marginLeft: '2px' } as React.CSSProperties,
  input: {
    width: '100%', height: '44px', padding: '0 36px 0 14px',
    borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-canvas)',
    fontSize: '14px', color: 'var(--text-primary)', outline: 'none',
    transition: 'border-color 150ms, box-shadow 150ms',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden'
  } as React.CSSProperties,
  inputError: {
    width: '100%', height: '44px', padding: '0 14px',
    borderRadius: '10px', border: '2px solid var(--danger)', background: 'var(--bg-surface)',
    fontSize: '14px', color: 'var(--text-primary)', outline: 'none',
  } as React.CSSProperties,
  textarea: {
    width: '100%', padding: '12px 14px', minHeight: '88px',
    borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-canvas)',
    fontSize: '14px', color: 'var(--text-primary)', outline: 'none', resize: 'none' as const,
    fontFamily: 'inherit', lineHeight: '1.5',
  } as React.CSSProperties,
  error: { fontSize: '12px', color: 'var(--danger)', marginTop: '6px', margin: '6px 0 0 0' } as React.CSSProperties,
  hint: { fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', margin: '4px 0 0 0' } as React.CSSProperties,
};

export default function GoalCreateDialog({
  sheetId, editGoalId, existingGoals, onClose,
}: GoalCreateDialogProps) {
  const user = useAuthStore((s) => s.user);
  const { addGoal, updateGoal, getGoalById, thrustAreas } = useDataStore();

  const editGoal = editGoalId ? getGoalById(editGoalId) : null;
  const isEdit = !!editGoal;
  const isSharedRecipient = editGoal?.isShared && !editGoal.isOwner;

  const [step, setStep] = useState(0);
  const [goalType, setGoalType] = useState('');
  const [thrustAreaId, setThrustAreaId] = useState(editGoal?.thrustAreaId || '');
  const [title, setTitle] = useState(editGoal?.title || '');
  const [description, setDescription] = useState(editGoal?.description || '');
  const [uomType, setUomType] = useState<UoMType>(editGoal?.uomType || 'NUMERIC_MIN');
  const [target, setTarget] = useState(editGoal?.target?.toString() || '');
  const [targetDate, setTargetDate] = useState(
    editGoal?.targetDate ? new Date(editGoal.targetDate).toISOString().split('T')[0] : ''
  );
  const [weightage, setWeightage] = useState(editGoal?.weightage?.toString() || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const otherGoalsWeightage = existingGoals
    .filter((g) => g.id !== editGoalId)
    .reduce((sum, g) => sum + g.weightage, 0);
  const remainingPool = BUSINESS_RULES.TOTAL_WEIGHTAGE - otherGoalsWeightage;

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!goalType && !isEdit) errs.goalType = 'Select a goal type';
      if (!thrustAreaId) errs.thrustAreaId = 'Required';
      if (!title.trim()) errs.title = 'Required';
      if (title.length > BUSINESS_RULES.MAX_TITLE_LENGTH) errs.title = `Max ${BUSINESS_RULES.MAX_TITLE_LENGTH} chars`;
    }
    if (s === 1) {
      if (uomType === 'TIMELINE' && !targetDate) errs.targetDate = 'Required';
      if (uomType !== 'ZERO_BASED' && uomType !== 'TIMELINE') {
        if (!target || isNaN(Number(target)) || Number(target) < 0) errs.target = 'Enter a valid number';
      }
    }
    if (s === 2) {
      const w = Number(weightage);
      if (!weightage || isNaN(w)) errs.weightage = 'Required';
      else if (!Number.isInteger(w)) errs.weightage = 'Must be a whole number';
      else if (w < BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL) errs.weightage = `Min ${BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}%`;
      else if (w > BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL) errs.weightage = `Max ${BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL}%`;
      else if (w > remainingPool) errs.weightage = `Only ${remainingPool}% remaining in pool`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, 2)); };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));
  const handleWeightageChange = (val: string) => setWeightage(val.replace(/[^0-9]/g, ''));
  const stepWeightage = (delta: number) => {
    const current = Number(weightage) || 0;
    const next = Math.max(BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL, Math.min(BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL, current + delta));
    if (next <= remainingPool) setWeightage(String(next));
  };

  const handleSave = () => {
    if (!validateStep(2)) return;
    // XSS sanitization on all text inputs (checklist 2.04)
    const cleanTitle = sanitizeTextInput(title);
    const cleanDesc = description ? sanitizeTextInput(description) : null;
    const goalData = {
      sheetId, thrustAreaId, title: cleanTitle,
      description: cleanDesc, uomType,
      target: uomType === 'ZERO_BASED' ? 0 : Number(target),
      targetDate: uomType === 'TIMELINE' ? new Date(targetDate) : null,
      weightage: Number(weightage), isShared: editGoal?.isShared || false,
      sharedFromId: editGoal?.sharedFromId || null, isOwner: editGoal?.isOwner ?? true,
    };
    try {
      if (isEdit && editGoal) {
        const actor = user ? { role: user.role } : undefined;
        if (isSharedRecipient) updateGoal(editGoal.id, { weightage: Number(weightage) }, actor);
        else updateGoal(editGoal.id, goalData, actor);
        toast.success('Goal updated');
      } else { addGoal(goalData); toast.success('Goal created'); }
      onClose();
    } catch (err) {
      toast.error('Failed to save goal', { description: err instanceof Error ? err.message : 'Please retry (ERR-400)' });
    }
  };

  const STEPS = ['Define', 'Measure', 'Weight'];
  const totalAfter = otherGoalsWeightage + (Number(weightage) || 0);

  /* ── Chip style helper ── */
  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '14px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
    border: active ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
    background: active ? 'var(--brand-light)' : 'var(--bg-surface)',
    transition: 'all 150ms',
  });

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{isEdit ? 'Edit Goal' : 'New Goal'}</h2>
          <button onClick={onClose} aria-label="Close"
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* ── Step pills ── */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 28px', gap: '8px', borderBottom: '1px solid var(--border)' }}>
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => { if (i < step || validateStep(step)) setStep(i); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '20px',
                border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: i === step ? '#2563eb' : 'transparent',
                color: i === step ? '#fff' : i < step ? '#2563eb' : '#94a3b8',
                transition: 'all 200ms',
              }}>
              <span style={{
                width: '20px', height: '20px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
                background: i === step ? 'rgba(255,255,255,0.25)' : i < step ? '#eff6ff' : '#f1f5f9',
                color: i === step ? '#fff' : i < step ? '#2563eb' : '#94a3b8',
              }}>{i < step ? '✓' : i + 1}</span>
              {s}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
            {remainingPool}% pool
          </span>
        </div>

        {/* ── Form ── */}
        <div style={{ padding: '28px', maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {step === 0 && (
            <>
              {/* Goal Type */}
              {!isEdit && (
                <div>
                  <label style={S.label}>Goal Type<span style={S.required}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    {GOAL_TYPE_CHIPS.map((chip) => (
                      <button key={chip.id} type="button"
                        onClick={() => { setGoalType(chip.id); if (chip.uoms.length > 0) setUomType(chip.uoms[0]); }}
                        style={chipStyle(goalType === chip.id)}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: goalType === chip.id ? '#2563eb' : '#0f172a', margin: '0 0 4px 0' }}>{chip.label}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.4', margin: 0 }}>{chip.desc}</p>
                      </button>
                    ))}
                  </div>
                  {errors.goalType && <p style={S.error}>{errors.goalType}</p>}
                </div>
              )}

              {/* Thrust Area */}
              <div>
                <label style={S.label}>Thrust Area<span style={S.required}>*</span></label>
                <select value={thrustAreaId} onChange={(e) => setThrustAreaId(e.target.value)} disabled={!!isSharedRecipient}
                  aria-label="Thrust Area"
                  style={errors.thrustAreaId ? S.inputError : S.input}>
                  <option value="">Select…</option>
                  {thrustAreas.filter((ta) => ta.isActive).map((ta) => (
                    <option key={ta.id} value={ta.id}>{ta.name}</option>
                  ))}
                </select>
                {errors.thrustAreaId && <p style={S.error}>{errors.thrustAreaId}</p>}
              </div>

              {/* Goal Title */}
              <div>
                <label style={S.label}>Goal Title<span style={S.required}>*</span></label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!!isSharedRecipient}
                  placeholder="e.g., Increase Q2 sales by 20%" maxLength={BUSINESS_RULES.MAX_TITLE_LENGTH}
                  aria-label="Goal Title" aria-required="true" aria-invalid={!!errors.title}
                  style={errors.title ? S.inputError : S.input} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  {errors.title ? <p style={S.error}>{errors.title}</p> : <span />}
                  <span style={S.hint}>{title.length}/{BUSINESS_RULES.MAX_TITLE_LENGTH}</span>
                </div>
                {/* Auto-tag suggestions */}
                {title.length > 5 && !thrustAreaId && (() => {
                  const tags = autoTagThrustArea(title);
                  if (tags.length === 0) return null;
                  const matchedAreas = tags.map(t => {
                    const ta = thrustAreas.find(a => a.name === t.name);
                    return ta ? { ...t, id: ta.id } : null;
                  }).filter(Boolean) as { name: string; confidence: number; id: string }[];
                  if (matchedAreas.length === 0) return null;
                  return (
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: '10px', background: 'var(--brand-muted, #eff6ff)', border: '1px solid var(--brand-light, #dbeafe)' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand, #2563eb)', margin: '0 0 6px 0' }}>Suggested thrust areas:</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {matchedAreas.map(tag => (
                          <button key={tag.id} type="button"
                            onClick={() => setThrustAreaId(tag.id)}
                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--brand, #2563eb)', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: 'var(--brand, #2563eb)' }}>
                            {tag.name} ({Math.round(tag.confidence * 100)}%)
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Real-time Goal Quality Score */}
                {title.length > 10 && (() => {
                  const quality = scoreGoalQuality(title, description);
                  const gradeColors = { excellent: '#16a34a', good: '#2563eb', fair: '#d97706', poor: '#dc2626' };
                  const gradeBgs = { excellent: 'var(--success-bg)', good: 'var(--brand-light)', fair: 'var(--warning-bg)', poor: 'var(--danger-bg)' };
                  return (
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: '10px', background: gradeBgs[quality.grade], border: `1px solid ${gradeColors[quality.grade]}22` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: gradeColors[quality.grade], textTransform: 'uppercase' }}>SMART Score: {quality.score}/100 ({quality.grade})</span>
                        <span style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'var(--bg-muted)', overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', width: `${quality.score}%`, background: gradeColors[quality.grade], borderRadius: '2px', transition: 'width 300ms' }} />
                        </span>
                      </div>
                      {quality.feedback.slice(0, 2).map((fb, i) => (
                        <p key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: '1.3' }}>{fb}</p>
                      ))}
                    </div>
                  );
                })()}

                {/* Semantic Overlap Warning */}
                {title.length > 5 && (() => {
                  const overlaps = detectGoalOverlap(title, existingGoals.filter(g => g.id !== editGoalId));
                  if (overlaps.length === 0) return null;
                  return (
                    <div style={{ marginTop: '6px', padding: '8px 12px', borderRadius: '8px', background: 'var(--warning-bg)', border: '1px solid var(--warning)' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--warning)', margin: '0 0 2px 0' }}>⚠️ Similar goal detected:</p>
                      {overlaps.map((o) => (
                        <p key={o.goalId} style={{ fontSize: '11px', color: '#a16207', margin: '1px 0 0 0' }}>
                          &ldquo;{o.goalTitle}&rdquo; ({Math.round(o.similarity * 100)}% match)
                        </p>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Description */}
              <div>
                <label style={S.label}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!!isSharedRecipient}
                  placeholder="What this goal aims to achieve…" rows={3} maxLength={BUSINESS_RULES.MAX_DESCRIPTION_LENGTH}
                  aria-label="Goal Description"
                  style={S.textarea} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              {/* UoM */}
              <div>
                <label style={S.label}>Unit of Measurement<span style={S.required}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {(Object.keys(UOM_LABELS) as UoMType[]).map((type) => (
                    <button key={type} type="button"
                      onClick={() => { if (!isSharedRecipient) { setUomType(type); if (type === 'ZERO_BASED') setTarget('0'); } }}
                      disabled={!!isSharedRecipient}
                      style={chipStyle(uomType === type)}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: uomType === type ? '#2563eb' : '#0f172a', margin: '0 0 4px 0' }}>
                        {type.replace('NUMERIC_', '').replace('_BASED', '').replace('PERCENTAGE_', '% ')}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.4', margin: 0 }}>{UOM_DESCRIPTIONS[type]}</p>
                    </button>
                  ))}
                </div>
              </div>

              {uomType !== 'ZERO_BASED' && uomType !== 'TIMELINE' && (
                <div>
                  <label style={S.label}>Target Value<span style={S.required}>*</span></label>
                  <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!!isSharedRecipient}
                    placeholder="e.g., 500" min={0} style={errors.target ? S.inputError : S.input} />
                  {errors.target && <p style={S.error}>{errors.target}</p>}
                </div>
              )}

              {uomType === 'TIMELINE' && (
                <div>
                  <label style={S.label}>Target Deadline<span style={S.required}>*</span></label>
                  <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} disabled={!!isSharedRecipient}
                    style={errors.targetDate ? S.inputError : S.input} />
                  {errors.targetDate && <p style={S.error}>{errors.targetDate}</p>}
                </div>
              )}

              {uomType === 'ZERO_BASED' && (
                <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--brand-light)', border: '1px solid #dbeafe' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Zero-based: 0 incidents = 100% score. Any value {'>'} 0 = 0%.</p>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              {/* Weightage */}
              <div>
                <label style={S.label}>Weightage (%)<span style={S.required}>*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button type="button" onClick={() => stepWeightage(-5)} aria-label="Decrease weightage"
                    style={{ width: '48px', height: '48px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--bg-canvas)', cursor: 'pointer', fontSize: '20px', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                  <input type="text" inputMode="numeric" value={weightage} onChange={(e) => handleWeightageChange(e.target.value)}
                    placeholder={`${BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}`}
                    aria-label="Goal Weightage" aria-required="true"
                    style={{ ...S.input, height: '48px', fontSize: '22px', fontWeight: 700, textAlign: 'center' }} />
                  <button type="button" onClick={() => stepWeightage(5)} aria-label="Increase weightage"
                    style={{ width: '48px', height: '48px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--bg-canvas)', cursor: 'pointer', fontSize: '20px', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                </div>
                <p style={S.hint}>
                  Available: {remainingPool}% · Range: {BUSINESS_RULES.MIN_WEIGHTAGE_PER_GOAL}–{Math.min(BUSINESS_RULES.MAX_WEIGHTAGE_PER_GOAL, remainingPool)}%
                </p>
                {errors.weightage && <p style={S.error}>{errors.weightage}</p>}

                {/* Smart Weightage Recommendation (A.3) */}
                {thrustAreaId && !weightage && (() => {
                  const ta = thrustAreas.find((a) => a.id === thrustAreaId);
                  if (!ta) return null;
                  const rec = recommendWeightage(ta.name, existingGoals.filter((g) => g.id !== editGoalId).length, remainingPool);
                  return (
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: '10px', background: 'var(--success-bg)', border: '1px solid #bbf7d0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>💡 AI Suggestion: {rec.suggested}%</span>
                        <button type="button" onClick={() => setWeightage(String(rec.suggested))}
                          style={{ padding: '3px 10px', borderRadius: '6px', border: '1px solid #16a34a', background: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#16a34a' }}>Apply</button>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{rec.rationale}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Progress bar */}
              <div style={{ padding: '16px 18px', borderRadius: '12px', background: 'var(--bg-canvas)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total after this goal</span>
                  <span style={{
                    fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    color: totalAfter === 100 ? '#10b981' : totalAfter > 100 ? '#ef4444' : '#0f172a',
                  }}>{totalAfter}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-muted)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '999px', transition: 'width 300ms ease',
                    width: `${Math.min(totalAfter, 100)}%`,
                    background: totalAfter === 100 ? '#10b981' : totalAfter > 100 ? '#ef4444' : '#2563eb',
                  }} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderTop: '1px solid var(--border)' }}>
          <button onClick={step === 0 ? onClose : prevStep}
            style={{ height: '40px', padding: '0 20px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          {step < 2 ? (
            <button onClick={nextStep}
              style={{ height: '40px', padding: '0 24px', borderRadius: '10px', border: 'none', background: 'var(--brand)', color: 'var(--text-inverse)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSave}
              style={{ height: '40px', padding: '0 24px', borderRadius: '10px', border: 'none', background: 'var(--brand)', color: 'var(--text-inverse)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
              {isEdit ? 'Save changes' : 'Create goal'}
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
