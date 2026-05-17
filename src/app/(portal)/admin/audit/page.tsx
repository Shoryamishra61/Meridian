/**
 * Meridian — Audit Trail
 * Immutable demo ledger for who changed what and when.
 */

'use client';

import { useDataStore } from '@/stores/data-store';
import { DEMO_ACCOUNTS } from '@/lib/constants';
import { formatDate, formatRelativeDate } from '@/lib/utils';

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  SUBMIT: { bg: '#eff6ff', color: '#2563eb' },
  APPROVE: { bg: '#ecfdf5', color: '#059669' },
  RETURN: { bg: '#fef2f2', color: '#dc2626' },
  MANAGER_EDIT: { bg: '#eff6ff', color: '#2563eb' },
  UNLOCK: { bg: '#fffbeb', color: '#d97706' },
  SYNC_ACHIEVEMENT: { bg: '#ecfdf5', color: '#059669' },
  ESCALATION_SCAN: { bg: '#fffbeb', color: '#d97706' },
  CHECKIN_COMPLETE: { bg: '#ecfdf5', color: '#059669' },
  PUSH_SHARED_GOAL: { bg: '#eff6ff', color: '#2563eb' },
};

const TH: React.CSSProperties = { padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '14px 20px', fontSize: '13px', color: '#475569', verticalAlign: 'top' };

export default function AuditTrailPage() {
  const { auditLogs } = useDataStore();
  const sortedLogs = [...auditLogs].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Audit Trail</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Who changed what and when, including post-lock changes and shared-goal syncs.
        </p>
      </div>

      {sortedLogs.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ fontSize: '22px' }}>📋</span>
          </div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0' }}>No audit entries yet</p>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Submissions, approvals, shared-goal syncs, admin unlocks, and escalations will appear here.
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={TH}>Action</th>
                  <th style={TH}>Entity</th>
                  <th style={TH}>Changes</th>
                  <th style={TH}>Actor</th>
                  <th style={{ ...TH, textAlign: 'right' }}>When</th>
                </tr>
              </thead>
              <tbody>
                {sortedLogs.map((log, index) => {
                  const actor = DEMO_ACCOUNTS.find((account) => account.id === log.changedBy);
                  const actionColor = ACTION_COLORS[log.action] || { bg: '#f1f5f9', color: '#64748b' };
                  return (
                    <tr key={log.id} style={{ borderBottom: index < sortedLogs.length - 1 ? '1px solid #e2e8f0' : 'none' }} className="hover:bg-slate-50 transition-colors">
                      <td style={TD}>
                        <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: actionColor.bg, color: actionColor.color, letterSpacing: '0.02em' }}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={TD}>
                        <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{log.entityType.replace(/_/g, ' ')}</span>
                        {log.fieldName && <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{log.fieldName}</span>}
                      </td>
                      <td style={{ ...TD, fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {log.oldValue && (
                            <span style={{ display: 'inline-block', maxWidth: '220px', padding: '3px 8px', borderRadius: '4px', background: '#fef2f2', color: '#991b1b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {JSON.stringify(log.oldValue)}
                            </span>
                          )}
                          {log.oldValue && log.newValue && <span style={{ color: '#94a3b8', fontSize: '12px' }}>→</span>}
                          {log.newValue && (
                            <span style={{ display: 'inline-block', maxWidth: '220px', padding: '3px 8px', borderRadius: '4px', background: '#ecfdf5', color: '#065f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {JSON.stringify(log.newValue)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...TD, fontWeight: 500, color: '#0f172a' }}>{actor?.name || log.changedBy}</td>
                      <td style={{ ...TD, textAlign: 'right', fontSize: '12px', color: '#94a3b8' }} title={formatDate(log.changedAt)}>
                        {formatRelativeDate(log.changedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
