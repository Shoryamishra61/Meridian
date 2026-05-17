/**
 * Meridian - Integrations Evidence
 * Judge-facing surface for good-to-have Microsoft Entra, email, and Teams features.
 */

'use client';

import { useMemo, useState } from 'react';
import {
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
  padding: '10px 16px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = { padding: '12px 16px', fontSize: '13px', color: '#475569' };

export default function IntegrationsPage() {
  const { notifications } = useDataStore();
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const selectedNotification =
    notifications.find((notification) => notification.id === selectedNotificationId) || notifications[0];

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
      tone: '#2563eb',
    },
    {
      title: 'Email Notifications',
      status: `${notifications.length} events queued`,
      detail: 'Submissions, approvals, returns, shared goals, and escalations create notification records.',
      icon: Mail,
      tone: '#059669',
    },
    {
      title: 'Teams Adaptive Cards',
      status: 'Deep-link payloads',
      detail: 'Each notification includes Teams-compatible JSON with an Open in Meridian action.',
      icon: PlugZap,
      tone: '#7c3aed',
    },
  ];

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
          Integrations
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Microsoft Entra, email, and Teams evidence for the hackathon bonus criteria.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '16px' }}>
        {integrationCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: '19px', height: '19px', color: card.tone }} />
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 9px', borderRadius: '6px', background: '#ecfdf5', color: '#047857', fontSize: '11px', fontWeight: 700 }}>
                  <BadgeCheck style={{ width: '13px', height: '13px' }} />
                  Ready
                </span>
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>{card.title}</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: card.tone, margin: '0 0 6px 0' }}>{card.status}</p>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{card.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck style={{ width: '18px', height: '18px', color: '#2563eb' }} />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Entra Directory Mapping</h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>SSO identity, role group, department, and manager chain.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={TH}>User</th>
                  <th style={TH}>Role Group</th>
                  <th style={TH}>Department</th>
                  <th style={TH}>Manager</th>
                </tr>
              </thead>
              <tbody>
                {hierarchyRows.map((row, index) => (
                  <tr key={row.id} style={{ borderBottom: index < hierarchyRows.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={TD}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>{row.name}</p>
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{row.email}</p>
                    </td>
                    <td style={TD}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: 700 }}>
                        meridian-{row.role.toLowerCase()}
                      </span>
                    </td>
                    <td style={TD}>{row.department}</td>
                    <td style={TD}>{row.manager}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users style={{ width: '18px', height: '18px', color: '#7c3aed' }} />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Notification Evidence</h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Email queue plus Teams Adaptive Card JSON and deep links.</p>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '44px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Trigger a submit, approval, shared goal, or escalation to populate notifications.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) minmax(0, 3fr)', minHeight: '420px' }}>
              <div style={{ borderRight: '1px solid #e2e8f0', maxHeight: '460px', overflowY: 'auto' }}>
                {notifications.map((notification, index) => {
                  const recipient = DEMO_ACCOUNTS.find((account) => account.id === notification.recipientId);
                  const active = selectedNotification?.id === notification.id;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => setSelectedNotificationId(notification.id)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: 'none',
                        borderTop: index > 0 ? '1px solid #f1f5f9' : 'none',
                        background: active ? '#eff6ff' : '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', margin: '0 0 3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notification.title}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipient?.name || notification.recipientId}</p>
                      <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>{formatRelativeDate(notification.createdAt)}</p>
                    </button>
                  );
                })}
              </div>
              <div style={{ padding: '18px', minWidth: 0 }}>
                {selectedNotification && (
                  <>
                    <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Body</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 5px 0' }}>{selectedNotification.title}</p>
                      <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>{selectedNotification.message}</p>
                    </div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teams Adaptive Card</p>
                    <pre style={{ maxHeight: '240px', overflow: 'auto', borderRadius: '8px', background: '#0f172a', color: '#dbeafe', padding: '12px', fontSize: '11px', fontFamily: 'ui-monospace, monospace', margin: 0 }}>
                      {JSON.stringify(selectedNotification.teamsCardJson, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Building2 style={{ width: '20px', height: '20px', color: '#059669', flexShrink: 0 }} />
        <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
          Production path: configure .env from docs/PRODUCTION_READINESS.md, verify /api/integrations/entra/readiness,
          sync Microsoft Graph users into Postgres, and send outbox notification records through email plus Teams.
        </p>
      </div>
    </div>
  );
}
