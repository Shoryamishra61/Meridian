/**
 * Meridian — Audit Trail
 * Immutable demo ledger for who changed what and when.
 */

'use client';

import { useState } from 'react';
import { useDataStore } from '@/stores/data-store';
import { DEMO_ACCOUNTS } from '@/lib/constants';
import { formatDate, formatRelativeDate } from '@/lib/utils';

const ACTION_STYLES: Record<string, string> = {
  SUBMIT: 'audit-action-brand',
  APPROVE: 'audit-action-success',
  RETURN: 'audit-action-danger',
  MANAGER_EDIT: 'audit-action-brand',
  UNLOCK: 'audit-action-warning',
  SYNC_ACHIEVEMENT: 'audit-action-success',
  ESCALATION_SCAN: 'audit-action-warning',
  CHECKIN_COMPLETE: 'audit-action-success',
  PUSH_SHARED_GOAL: 'audit-action-brand',
};

const TH: React.CSSProperties = { padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)', verticalAlign: 'top' };
const AUDIT_PAGE_SIZE = 25;

const auditValueChipClass = (tone: 'old' | 'new'): string => {
  return tone === 'old'
    ? 'audit-value-chip audit-value-old'
    : 'audit-value-chip audit-value-new';
};

export default function AuditTrailPage() {
  const { auditLogs } = useDataStore();
  const [page, setPage] = useState(0);
  const sortedLogs = [...auditLogs].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / AUDIT_PAGE_SIZE));
  const pagedLogs = sortedLogs.slice(page * AUDIT_PAGE_SIZE, (page + 1) * AUDIT_PAGE_SIZE);

  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">Admin workspace</p>
          <h1 style={{ margin: '0 0 6px 0' }}>Audit Trail</h1>
          <p className="app-page-meta">Who changed what and when, including post-lock changes and shared-goal syncs.</p>
        </div>
      </header>

      {sortedLogs.length === 0 ? (
        <div className="card" style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ fontSize: '22px' }}>📋</span>
          </div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>No audit entries yet</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Submissions, approvals, shared-goal syncs, admin unlocks, and escalations will appear here.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-canvas)' }}>
                  <th style={TH}>Action</th>
                  <th style={TH}>Entity</th>
                  <th style={TH}>Changes</th>
                  <th style={TH}>Actor</th>
                  <th style={{ ...TH, textAlign: 'right' }}>When</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log, index) => {
                  const actor = DEMO_ACCOUNTS.find((account) => account.id === log.changedBy);
                  const actionStyle = ACTION_STYLES[log.action] || 'audit-action-neutral';
                  return (
                    <tr key={log.id} style={{ borderBottom: index < pagedLogs.length - 1 ? '1px solid var(--border)' : 'none' }} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                      <td style={TD}>
                        <span className={`audit-action-chip ${actionStyle}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={TD}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{log.entityType.replace(/_/g, ' ')}</span>
                        {log.fieldName && <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{log.fieldName}</span>}
                      </td>
                      <td style={{ ...TD, fontSize: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {(() => {
                            if (!log.oldValue && !log.newValue) {
                              return <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No changes recorded</span>;
                            }

                            const renderVal = (val: unknown): string => {
                              if (val === null || val === undefined || val === '') return '—';
                              if (typeof val === 'object') return JSON.stringify(val);
                              return String(val);
                            };

                            const isOldObj = typeof log.oldValue === 'object' && log.oldValue !== null;
                            const isNewObj = typeof log.newValue === 'object' && log.newValue !== null;

                            // If either is an object, we expand the keys for a detailed diff
                            if (isOldObj || isNewObj) {
                              const oldObj = isOldObj ? (log.oldValue as Record<string, unknown>) : {};
                              const newObj = isNewObj ? (log.newValue as Record<string, unknown>) : {};
                              const allKeys = [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])];
                              
                              return allKeys.map((key) => {
                                const oldVal = oldObj[key];
                                const newVal = newObj[key];
                                if (oldVal === newVal) return null;
                                
                                return (
                                  <div key={key} style={{ marginBottom: '4px', lineHeight: '1.8' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '6px' }}>{key}:</span>
                                    <span className={auditValueChipClass('old')}>
                                      {renderVal(oldVal)}
                                    </span>
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', margin: '0 6px' }}>→</span>
                                    <span className={auditValueChipClass('new')}>
                                      {renderVal(newVal)}
                                    </span>
                                  </div>
                                );
                              });
                            }

                            // Fallback: simple old → new string rendering
                            return (
                              <div style={{ lineHeight: '1.8' }}>
                                <span className={auditValueChipClass('old')}>
                                  {renderVal(log.oldValue)}
                                </span>
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: '0 6px' }}>→</span>
                                <span className={auditValueChipClass('new')}>
                                  {renderVal(log.newValue)}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td style={{ ...TD, fontWeight: 500, color: 'var(--text-primary)' }}>{actor?.name || log.changedBy}</td>
                      <td style={{ ...TD, textAlign: 'right', fontSize: '12px', color: 'var(--text-tertiary)' }} title={formatDate(log.changedAt)}>
                        <div>{formatRelativeDate(log.changedAt)}</div>
                        {log.integrityHash && (
                          <div
                            title={`Chain integrity hash: ${log.integrityHash}`}
                            style={{ marginTop: '4px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '10px', color: 'var(--text-tertiary)', opacity: 0.7 }}
                          >
                            #{log.integrityHash.slice(0, 8)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {sortedLogs.length > AUDIT_PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {page * AUDIT_PAGE_SIZE + 1}–{Math.min((page + 1) * AUDIT_PAGE_SIZE, sortedLogs.length)} of {sortedLogs.length} entries
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                  style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: '13px', color: page === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.55 : 1 }}>Prev</button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '13px', color: 'var(--text-secondary)' }}>{page + 1}/{totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
                  style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: '13px', color: page >= totalPages - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.55 : 1 }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
