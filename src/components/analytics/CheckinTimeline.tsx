'use client';

/**
 * Check-in Timeline — vertical chronological list of recent manager check-ins
 * for the scoped team. Pass employees + checkins; this component does no role
 * filtering itself.
 */

import { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import type { ManagerCheckin } from '@/types';
import type { DEMO_ACCOUNTS } from '@/lib/constants';

type DemoAccount = (typeof DEMO_ACCOUNTS)[number];

interface Props {
  employees: DemoAccount[];
  checkins: ManagerCheckin[];
  /** Max items to render (default 8). */
  limit?: number;
  title?: string;
  subtitle?: string;
}

function formatRelative(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function CheckinTimeline({ employees, checkins, limit = 8, title, subtitle }: Props) {
  const items = useMemo(() => {
    const sorted = [...checkins].sort((a, b) => {
      const da = a.completedAt instanceof Date ? a.completedAt.getTime() : new Date(a.completedAt).getTime();
      const db = b.completedAt instanceof Date ? b.completedAt.getTime() : new Date(b.completedAt).getTime();
      return db - da;
    });
    return sorted.slice(0, limit).map((c) => {
      const employee = employees.find((e) => e.id === c.employeeId);
      const at = c.completedAt instanceof Date ? c.completedAt : new Date(c.completedAt);
      return { checkin: c, employee, at };
    });
  }, [checkins, employees, limit]);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="app-section-header">
        <div className="title">
          <h2>{title || 'Recent Check-ins'}</h2>
          <p>{subtitle || 'Latest manager comments captured for this team'}</p>
        </div>
      </div>
      <div style={{ padding: '12px 16px 16px 16px' }}>
        {items.length === 0 ? (
          <div style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No check-ins logged yet for this team.</p>
          </div>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map(({ checkin, employee, at }, idx) => (
              <li key={checkin.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'color-mix(in srgb, var(--brand) 16%, transparent)',
                    color: 'var(--brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MessageSquare size={14} strokeWidth={2.4} />
                  </div>
                  {idx < items.length - 1 && (
                    <div style={{ width: '2px', flex: 1, minHeight: '20px', marginTop: '4px', background: 'var(--border)' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {employee?.name || 'Unknown employee'}
                    </p>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'var(--bg-muted)',
                      color: 'var(--text-secondary)',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}>
                      {checkin.quarter}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: '4px 0 0 0',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {checkin.comment}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>
                    {formatRelative(at)} · {employee?.department || '—'}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
