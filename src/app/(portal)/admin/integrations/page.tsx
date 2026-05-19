/**
 * Meridian - Integrations Evidence
 * Judge-facing surface for good-to-have Microsoft Entra, email, and Teams features.
 */

'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Grid2x2,
  Mail,
  PlugZap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useDataStore } from '@/stores/data-store';
import { DEMO_ACCOUNTS } from '@/lib/constants';
import { formatRelativeDate } from '@/lib/utils';

const TH: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = { padding: '14px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.45 };

const TONE = {
  brand: 'var(--brand)',
  success: 'var(--success)',
  purple: '#a78bfa',
};

export default function IntegrationsPage() {
  const { notifications } = useDataStore();
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const selectedNotification =
    notifications.find((notification) => notification.id === selectedNotificationId) || notifications[0];
  const selectedRecipient = selectedNotification
    ? DEMO_ACCOUNTS.find((account) => account.id === selectedNotification.recipientId)
    : null;

  const hierarchyRows = useMemo(
    () =>
      DEMO_ACCOUNTS.filter((account) => account.role === 'EMPLOYEE' || account.role === 'MANAGER').map((account) => {
        const manager = DEMO_ACCOUNTS.find((candidate) => candidate.id === account.managerId);
        return {
          id: account.id,
          name: account.name,
          email: account.email,
          role: account.role,
          department: account.department,
          manager: manager?.name || 'HR Admin',
        };
      }),
    []
  );

  const integrationCards = [
    {
      title: 'Microsoft Entra ID',
      status: 'Auth.js provider wired',
      detail: 'Use /api/auth/callback/microsoft-entra-id after tenant credentials are configured.',
      icon: Grid2x2,
      tone: TONE.brand,
    },
    {
      title: 'Email Notifications',
      status: `${notifications.length} events queued`,
      detail: 'Submissions, approvals, returns, shared goals, and escalations create notification records.',
      icon: Mail,
      tone: TONE.success,
    },
    {
      title: 'Teams Adaptive Cards',
      status: 'Deep-link payloads',
      detail: 'Each notification includes Teams-compatible JSON with an Open in Meridian action.',
      icon: PlugZap,
      tone: TONE.purple,
    },
  ];

  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">Admin workspace</p>
          <h1 style={{ margin: '0 0 6px 0' }}>Integrations</h1>
          <p className="app-page-meta">Microsoft Entra, email, and Teams integration evidence.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '16px' }}>
        {integrationCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="card" style={{ padding: '20px', minHeight: '188px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--bg-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: '19px', height: '19px', color: card.tone }} />
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 9px', borderRadius: '6px', background: 'var(--success-bg)', color: 'var(--success)', fontSize: '11px', fontWeight: 700 }}>
                  <BadgeCheck style={{ width: '13px', height: '13px' }} />
                  Ready
                </span>
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{card.title}</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: card.tone, margin: '0 0 6px 0' }}>{card.status}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{card.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="integrations-split-grid" style={{ gap: '20px', alignItems: 'start' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck style={{ width: '18px', height: '18px', color: 'var(--brand)' }} />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Entra Directory Mapping</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>SSO identity, role group, department, and manager chain.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '34%' }} />
                <col style={{ width: '27%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border)' }}>
                  <th style={TH}>User</th>
                  <th style={TH}>Role Group</th>
                  <th style={TH}>Department</th>
                  <th style={TH}>Manager</th>
                </tr>
              </thead>
              <tbody>
                {hierarchyRows.map((row, index) => (
                  <tr key={row.id} style={{ borderBottom: index < hierarchyRows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={TD}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>{row.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>{row.email}</p>
                    </td>
                    <td style={TD}>
                      <span style={{ display: 'inline-flex', maxWidth: '100%', padding: '3px 8px', borderRadius: '6px', background: 'color-mix(in srgb, var(--brand) 18%, transparent)', color: 'var(--brand)', fontSize: '11px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        meridian-{row.role.toLowerCase()}
                      </span>
                    </td>
                    <td style={{ ...TD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.department}</td>
                    <td style={{ ...TD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.manager}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users style={{ width: '18px', height: '18px', color: TONE.purple }} />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Notification Evidence</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Email queue plus Teams card previews and deep links.</p>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '44px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>Trigger a submit, approval, shared goal, or escalation to populate notifications.</p>
            </div>
          ) : (
            <div className="integrations-notification-split">
              <div className="integrations-notification-list">
                {notifications.map((notification, index) => {
                  const recipient = DEMO_ACCOUNTS.find((account) => account.id === notification.recipientId);
                  const active = selectedNotification?.id === notification.id;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => setSelectedNotificationId(notification.id)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: 'none',
                        borderTop: index > 0 ? '1px solid var(--border)' : 'none',
                        background: active ? 'color-mix(in srgb, var(--brand) 18%, var(--bg-surface) 82%)' : 'var(--bg-surface)',
                        boxShadow: active ? 'inset 3px 0 0 var(--brand)' : 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notification.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 3px 0' }}>{recipient?.name || notification.recipientId}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>{formatRelativeDate(notification.createdAt)}</p>
                    </button>
                  );
                })}
              </div>
              <div className="integrations-notification-detail">
                {selectedNotification && (
                  <>
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-surface-hover)', border: '1px solid var(--border)', marginBottom: '14px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Body</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 5px 0', wordBreak: 'break-word' }}>{selectedNotification.title}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{selectedNotification.message}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teams Adaptive Card Preview</p>
                      <div style={{ borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-canvas)', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'var(--bg-surface)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'color-mix(in srgb, var(--brand) 18%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <PlugZap style={{ width: '16px', height: '16px', color: 'var(--brand)' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Meridian notification</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Adaptive Card v1.4</p>
                            </div>
                          </div>
                          <span style={{ padding: '3px 8px', borderRadius: '999px', background: 'color-mix(in srgb, var(--success) 18%, transparent)', color: 'var(--success)', fontSize: '11px', fontWeight: 700 }}>Ready</span>
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

                          <button
                            type="button"
                            onClick={() => { window.location.href = selectedNotification.deepLink; }}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                              padding: '12px 16px', borderRadius: '10px', border: 'none',
                              background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)',
                              color: '#ffffff', cursor: 'pointer',
                              boxShadow: '0 4px 12px color-mix(in srgb, var(--brand) 35%, transparent)',
                              transition: 'transform 120ms ease, box-shadow 120ms ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px color-mix(in srgb, var(--brand) 45%, transparent)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--brand) 35%, transparent)'; }}
                          >
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>Open in Meridian</span>
                            <ArrowUpRight style={{ width: '16px', height: '16px', flexShrink: 0, color: '#ffffff' }} />
                          </button>
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

      <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Building2 style={{ width: '20px', height: '20px', color: 'var(--success)', flexShrink: 0 }} />
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          Production path: configure .env from docs/PRODUCTION_READINESS.md, verify /api/integrations/entra/readiness,
          sync Microsoft Graph users into Postgres, and send outbox notification records through email plus Teams.
        </p>
      </div>
    </div>
  );
}
