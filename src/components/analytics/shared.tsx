/**
 * Meridian Analytics — Reusable panel components
 * Insight cards, stat cards, progress bars used across analytics panels.
 */
'use client';

import React from 'react';

/* ── Insight Card: Plain-English takeaway beneath every chart ── */
export function InsightCard({ icon, text, action }: { icon: string; text: string; action?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', marginTop: '16px', borderRadius: '10px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', color: '#0c4a6e', margin: 0, lineHeight: '1.5' }}>{text}</p>
        {action && <p style={{ fontSize: '12px', color: '#2563eb', margin: '4px 0 0 0', fontWeight: 600 }}>→ {action}</p>}
      </div>
    </div>
  );
}

/* ── Panel Wrapper ── */
export function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>{title}</h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{subtitle}</p>
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
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{sublabel || `${pct}%`}</span>
      </div>
      <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '999px', transition: 'width 500ms' }} />
      </div>
    </div>
  );
}

/* ── Score color helper ── */
export function scoreColor(v: number): string {
  if (v >= 90) return '#10b981';
  if (v >= 75) return '#f59e0b';
  return '#ef4444';
}

/* ── Tooltip ── */
export function ChartTip({ active, label, payload }: { active?: boolean; label?: string; payload?: Array<{ name?: string; value?: number; color?: string }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      {label && <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 6px 0', fontWeight: 600 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: i < payload.length - 1 ? '4px' : 0 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color || '#2563eb', flexShrink: 0 }} />
          <span style={{ color: '#cbd5e1' }}>{p.name}</span>
          <span style={{ color: '#fff', fontWeight: 700, marginLeft: 'auto' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}
