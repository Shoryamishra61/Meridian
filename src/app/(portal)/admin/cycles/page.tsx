/**
 * Meridian — Cycle Settings & Admin Exceptions
 * Demo-date schedule visibility plus admin unlock control.
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { DEFAULT_CYCLE_WINDOWS, DEMO_ACCOUNTS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

const TH: React.CSSProperties = { padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' };

export default function CycleSettingsPage() {
  const user = useAuthStore((state) => state.user)!;
  const { addAuditLog, addNotification, cycles, goalSheets, updateSheetStatus } = useDataStore();
  const [unlockReasonBySheet, setUnlockReasonBySheet] = useState<Record<string, string>>({});
  const activeCycle = cycles.find((cycle) => cycle.isActive);
  const lockedSheets = goalSheets.filter((sheet) => sheet.status === 'LOCKED' || sheet.status === 'APPROVED');

  const unlockSheet = (sheetId: string) => {
    const reason = unlockReasonBySheet[sheetId]?.trim();
    const sheet = goalSheets.find((candidate) => candidate.id === sheetId);
    if (!sheet) return;
    if (!reason) {
      toast.error('Unlock reason required');
      return;
    }

    updateSheetStatus(sheetId, 'RETURNED', {
      lockedAt: null,
      returnedAt: new Date(),
      returnedReason: `Admin unlock: ${reason}`,
    });
    addAuditLog({
      entityType: 'goal_sheet',
      entityId: sheetId,
      action: 'UNLOCK',
      fieldName: 'status',
      oldValue: { status: sheet.status, lockedAt: sheet.lockedAt },
      newValue: { status: 'RETURNED', reason },
      changedBy: user.id,
      ipAddress: null,
      userAgent: null,
    });
    addNotification({
      type: 'GOAL_RETURNED',
      recipientId: sheet.employeeId,
      title: 'Goal sheet unlocked by Admin',
      message: `HR unlocked your goal sheet for rework: ${reason}`,
      deepLink: '/goals',
    });
    toast.success('Goal sheet unlocked');
    setUnlockReasonBySheet((previous) => ({ ...previous, [sheetId]: '' }));
  };

  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">Admin workspace</p>
          <h1 style={{ margin: '0 0 6px 0' }}>Cycle Settings</h1>
          <p className="app-page-meta">{activeCycle?.name} schedule, demo windows, and admin exception handling.</p>
        </div>
      </header>

      {/* Schedule Table */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-canvas)' }}>
                <th style={TH}>Period</th>
                <th style={TH}>Opens</th>
                <th style={TH}>Closes</th>
                <th style={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_CYCLE_WINDOWS.map((window, i) => (
                <tr key={window.name} style={{ borderBottom: i < DEFAULT_CYCLE_WINDOWS.length - 1 ? '1px solid #e2e8f0' : 'none' }} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                  <td style={{ ...TD, fontWeight: 500, color: 'var(--text-primary)' }}>{window.name}</td>
                  <td style={TD}>{formatDate(window.opensAt)}</td>
                  <td style={TD}>{formatDate(window.closesAt)}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)' }}>{window.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Unlock Exceptions */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Admin Unlock Exceptions</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Locked goals require HR/Admin intervention before employee edits are re-enabled.</p>
        </div>
        {lockedSheets.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>No locked sheets are available for exception handling.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-canvas)' }}>
                  <th style={TH}>Employee</th>
                  <th style={TH}>Status</th>
                  <th style={TH}>Reason</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lockedSheets.map((sheet, index) => {
                  const employee = DEMO_ACCOUNTS.find((account) => account.id === sheet.employeeId);
                  return (
                    <tr key={sheet.id} style={{ borderBottom: index < lockedSheets.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                      <td style={TD}>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>{employee?.name || sheet.employeeId}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>{employee?.department}</p>
                      </td>
                      <td style={TD}>
                        <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: 'var(--success-bg)', color: 'var(--success)' }}>Locked</span>
                      </td>
                      <td style={TD}>
                        <input
                          value={unlockReasonBySheet[sheet.id] || ''}
                          onChange={(event) => setUnlockReasonBySheet((previous) => ({ ...previous, [sheet.id]: event.target.value }))}
                          placeholder="Reason for unlock"
                          style={{ width: '100%', height: '34px', padding: '0 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-canvas)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                        />
                      </td>
                      <td style={{ ...TD, textAlign: 'right' }}>
                        <button
                          onClick={() => unlockSheet(sheet.id)}
                          style={{ height: '32px', padding: '0 16px', borderRadius: '6px', border: 'none', background: '#f59e0b', fontSize: '12px', fontWeight: 600, color: 'var(--text-inverse)', cursor: 'pointer' }}
                        >Unlock</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
