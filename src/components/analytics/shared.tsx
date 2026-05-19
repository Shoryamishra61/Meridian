/**
 * Meridian Analytics — Reusable panel components
 * Insight cards, stat cards, progress bars used across analytics panels.
 */
'use client';

import React from 'react';

/* ── Insight Card: Plain-English takeaway beneath every chart ── */
export function InsightCard({ icon, text, action }: { icon: string; text: string; action?: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '12px 14px',
      marginTop: '16px',
      borderRadius: '10px',
      background: 'var(--bg-surface-hover)',
      border: '1px solid var(--border)',
      boxShadow: 'inset 3px 0 0 var(--brand)',
    }}>
      <span style={{
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
        background: 'var(--bg-muted)',
        fontSize: '14px',
        flexShrink: 0,
      }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: '1.5' }}>{text}</p>
        {action && <p style={{ fontSize: '12px', color: 'var(--brand-hover)', margin: '4px 0 0 0', fontWeight: 600 }}>→ {action}</p>}
      </div>
    </div>
  );
}

/* ── Panel Wrapper ── */
export function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{title}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

/* ── Progress Bar ── */
export function ProgressBar({ value, max, color, label, sublabel }: { value: number; max: number; color: string; label: string; sublabel?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>{sublabel || `${pct}%`}</span>
      </div>
      <div style={{ height: '8px', background: 'var(--bg-muted)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '999px', transition: 'width 500ms' }} />
      </div>
    </div>
  );
}

/* ── Score color helper ── */
export function scoreColor(v: number): string {
  if (v >= 90) return 'var(--success)';
  if (v >= 75) return 'var(--warning)';
  return 'var(--danger)';
}

/* ── Tooltip ── */
export function ChartTip({ active, label, payload }: { active?: boolean; label?: string; payload?: Array<{ name?: string; value?: number; color?: string }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      {label && <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 6px 0', fontWeight: 600 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: i < payload.length - 1 ? '4px' : 0 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color || 'var(--brand)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, marginLeft: 'auto' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}
