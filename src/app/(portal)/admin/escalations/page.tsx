/**
 * Meridian — Escalations
 * Rule-based escalation simulation plus Teams Adaptive Card evidence.
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpRight, PlugZap } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { DEMO_ACCOUNTS, type Quarter } from '@/lib/constants';
import { formatRelativeDate } from '@/lib/utils';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const tint = (token: string, amount = 18) => `color-mix(in srgb, ${token} ${amount}%, transparent)`;

const pillStyle = (tone: 'brand' | 'warning' | 'danger' | 'success'): React.CSSProperties => {
  const token = tone === 'brand' ? 'var(--brand)' : `var(--${tone})`;
  return {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 800,
    background: tint(token),
    border: `1px solid ${tint(token, 36)}`,
    color: tone === 'brand' ? 'var(--brand-hover)' : token,
  };
};

export default function EscalationsPage() {
  const user = useAuthStore((state) => state.user)!;
  const { escalationEvents, notifications, runEscalationScan } = useDataStore();
  const [quarter, setQuarter] = useState<Quarter>('Q1');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const selectedNotification = notifications.find((notification) => notification.id === selectedNotificationId) || notifications[0];
  const selectedRecipient = selectedNotification
    ? DEMO_ACCOUNTS.find((account) => account.id === selectedNotification.recipientId)
    : null;

  const handleRunScan = () => {
    const created = runEscalationScan(user.id, quarter);
    toast.success('Escalation scan complete', {
      description: `${created.length} escalation events created for ${quarter}.`,
    });
    if (created.length > 0) {
      const latest = notifications[0];
      if (latest) setSelectedNotificationId(latest.id);
    }
  };

  const stats = [
    { label: 'Events', value: escalationEvents.length, color: 'var(--brand)', bg: tint('var(--brand)') },
    { label: 'Notifications', value: notifications.length, color: 'var(--warning)', bg: tint('var(--warning)') },
    { label: 'Open', value: escalationEvents.filter((event) => !event.resolvedAt).length, color: 'var(--danger)', bg: tint('var(--danger)') },
  ];

  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">Admin workspace</p>
          <h1 style={{ margin: '0 0 6px 0' }}>Escalations</h1>
          <p className="app-page-meta">Rule-based follow-up for late submissions, approvals, and check-ins.</p>
        </div>
        <div className="app-page-actions">
          <select
            value={quarter}
            onChange={(event) => setQuarter(event.target.value as Quarter)}
            className="input"
            style={{ height: '36px', width: 'auto', fontSize: '13px', padding: '0 12px' }}
          >
            {QUARTERS.map((candidate) => (
              <option key={candidate} value={candidate}>{candidate}</option>
            ))}
          </select>
          <button onClick={handleRunScan} className="btn-primary btn-sm">
            Run scan
          </button>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px' }}>
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
              </div>
            </div>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(520px,0.95fr)_minmax(580px,1.05fr)]" style={{ gap: '20px', alignItems: 'start' }}>
        {/* Escalation Log */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Escalation Log</h2>
          </div>
          {escalationEvents.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>Run a scan to generate demo escalation evidence.</p>
            </div>
          ) : (
            <div>
              {escalationEvents.map((event, index) => {
                const target = DEMO_ACCOUNTS.find((account) => account.id === event.targetUserId);
                const notified = DEMO_ACCOUNTS.find((account) => account.id === event.notifiedUserId);
                const isResolved = !!event.resolvedAt;

                const RULE_LABELS: Record<string, string> = {
                  'rule-late-submit': 'Late Goal Submission',
                  'rule-late-approve': 'Pending Manager Approval',
                  'rule-checkin-overdue': 'Check-in Overdue',
                };
                const levelTone = event.level === 'HR' ? 'danger' : event.level === 'MANAGER' ? 'warning' : 'brand';

                return (
                  <div key={event.id} style={{ padding: '18px 20px', borderTop: index > 0 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '14px' }}>{isResolved ? '✅' : '🔴'}</span>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {RULE_LABELS[event.ruleId] || event.ruleId}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={pillStyle(levelTone)}>{event.level}</span>
                        <span style={pillStyle(isResolved ? 'success' : 'danger')}>
                          {isResolved ? 'Resolved' : 'Open'}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 2px 0', paddingLeft: '26px', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{target?.name || event.targetUserId}</span> &rarr; Notified: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{notified?.name || event.notifiedUserId}</span>
                    </p>
                    {event.resolutionNote && (
                      <p className="text-emerald-700 dark:text-emerald-400" style={{ fontSize: '11px', margin: '4px 0 0 0', paddingLeft: '26px', fontStyle: 'italic' }}>
                        {event.resolutionNote}
                      </p>
                    )}
                    <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: '4px 0 0 0', paddingLeft: '26px' }}>{formatRelativeDate(event.triggeredAt)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notification Preview */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Email & Teams Notification Preview</h2>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>Notifications from submissions, approvals, shared goals, and escalations appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(210px,0.82fr) minmax(300px,1.18fr)', minHeight: '460px' }}>
              <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', maxHeight: '520px', background: 'var(--bg-surface)' }}>
                {notifications.map((notification, index) => {
                  const recipient = DEMO_ACCOUNTS.find((account) => account.id === notification.recipientId);
                  const active = selectedNotification?.id === notification.id;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => setSelectedNotificationId(notification.id)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '14px 16px', border: 'none', cursor: 'pointer', transition: 'background 150ms',
                        borderTop: index > 0 ? '1px solid var(--border)' : 'none',
                        background: active ? 'color-mix(in srgb, var(--brand) 18%, var(--bg-surface) 82%)' : 'var(--bg-surface)',
                        boxShadow: active ? 'inset 3px 0 0 var(--brand)' : 'none',
                      }}
                    >
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notification.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>{recipient?.name || notification.recipientId}</p>
                    </button>
                  );
                })}
              </div>
              <div style={{ padding: '20px', minWidth: 0, maxHeight: '520px', overflowY: 'auto', background: 'var(--bg-surface)' }}>
                {selectedNotification && (
                  <>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>{selectedNotification.title}</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 18px 0', lineHeight: 1.55 }}>{selectedNotification.message}</p>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teams Adaptive Card Preview</p>
                    <div style={{ borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-canvas)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'var(--bg-surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: tint('var(--brand)'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <PlugZap style={{ width: '16px', height: '16px', color: 'var(--brand)' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Meridian escalation notice</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Adaptive Card v1.4</p>
                          </div>
                        </div>
                        <span className="badge-success" style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>Ready</span>
                      </div>

                      <div style={{ padding: '14px' }}>
                        <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', marginBottom: '12px' }}>
                          <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', lineHeight: 1.3 }}>{selectedNotification.title}</p>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{selectedNotification.message}</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', minWidth: 0 }}>
                            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recipient</p>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedRecipient?.name || selectedNotification.recipientId}</p>
                          </div>
                          <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', minWidth: 0 }}>
                            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deep link</p>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedNotification.deepLink}</p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '11px 12px', borderRadius: '8px', background: 'var(--brand)', color: 'var(--text-inverse)' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800 }}>Open in Meridian</span>
                          <ArrowUpRight style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
