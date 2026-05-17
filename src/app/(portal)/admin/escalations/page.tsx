/**
 * Meridian — Escalations
 * Rule-based escalation simulation plus Teams Adaptive Card evidence.
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { DEMO_ACCOUNTS, type Quarter } from '@/lib/constants';
import { formatRelativeDate } from '@/lib/utils';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function EscalationsPage() {
  const user = useAuthStore((state) => state.user)!;
  const { escalationEvents, notifications, runEscalationScan } = useDataStore();
  const [quarter, setQuarter] = useState<Quarter>('Q1');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const selectedNotification = notifications.find((notification) => notification.id === selectedNotificationId) || notifications[0];

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
    { label: 'Events', value: escalationEvents.length, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Notifications', value: notifications.length, color: '#d97706', bg: '#fffbeb' },
    { label: 'Open', value: escalationEvents.filter((event) => !event.resolvedAt).length, color: '#dc2626', bg: '#fef2f2' },
  ];

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Escalations</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Rule-based follow-up for late submissions, approvals, and check-ins.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={quarter}
            onChange={(event) => setQuarter(event.target.value as Quarter)}
            style={{ height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', color: '#0f172a', outline: 'none', cursor: 'pointer' }}
          >
            {QUARTERS.map((candidate) => (
              <option key={candidate} value={candidate}>{candidate}</option>
            ))}
          </select>
          <button
            onClick={handleRunScan}
            style={{ height: '36px', padding: '0 16px', borderRadius: '8px', border: 'none', background: '#2563eb', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
          >Run scan</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px' }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
              </div>
            </div>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: '20px' }}>
        {/* Escalation Log */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Escalation Log</h2>
          </div>
          {escalationEvents.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Run a scan to generate demo escalation evidence.</p>
            </div>
          ) : (
            <div>
              {escalationEvents.map((event, index) => {
                const target = DEMO_ACCOUNTS.find((account) => account.id === event.targetUserId);
                const notified = DEMO_ACCOUNTS.find((account) => account.id === event.notifiedUserId);
                return (
                  <div key={event.id} style={{ padding: '14px 20px', borderTop: index > 0 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{event.ruleId.replaceAll('_', ' ')}</p>
                      <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatRelativeDate(event.triggeredAt)}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                      Target: {target?.name || event.targetUserId} → Notify {notified?.name || event.notifiedUserId}
                      <span style={{ marginLeft: '6px', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: event.level === 'L2' ? '#fef3c7' : '#fef2f2', color: event.level === 'L2' ? '#92400e' : '#991b1b' }}>{event.level}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notification Preview */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Email & Teams Notification Preview</h2>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Notifications from submissions, approvals, shared goals, and escalations appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', minHeight: '360px' }}>
              <div style={{ borderRight: '1px solid #e2e8f0', overflowY: 'auto', maxHeight: '400px' }}>
                {notifications.map((notification, index) => {
                  const recipient = DEMO_ACCOUNTS.find((account) => account.id === notification.recipientId);
                  const active = selectedNotification?.id === notification.id;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => setSelectedNotificationId(notification.id)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', cursor: 'pointer', transition: 'background 150ms',
                        borderTop: index > 0 ? '1px solid #f1f5f9' : 'none',
                        background: active ? '#eff6ff' : '#fff',
                      }}
                    >
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notification.title}</p>
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipient?.name || notification.recipientId}</p>
                    </button>
                  );
                })}
              </div>
              <div style={{ padding: '20px' }}>
                {selectedNotification && (
                  <>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0' }}>{selectedNotification.title}</p>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>{selectedNotification.message}</p>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Adaptive Card JSON</p>
                    <pre style={{ maxHeight: '220px', overflow: 'auto', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', fontSize: '11px', color: '#475569', fontFamily: 'ui-monospace, monospace', margin: 0 }}>
                      {JSON.stringify(selectedNotification.teamsCardJson, null, 2)}
                    </pre>
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
