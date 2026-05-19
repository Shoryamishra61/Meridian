/**
 * Meridian - Achievement Reports
 * Clean enterprise table with inline styles. CSV/Excel export.
 */

'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useDemoDateStore } from '@/stores/demo-date-store';
import { DEMO_ACCOUNTS, UOM_LABELS, type Quarter } from '@/lib/constants';
import { calculateProgressScore, formatScore, getScoreColor } from '@/lib/calculations';
import { cn } from '@/lib/utils';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
const PAGE_SIZE = 50;
const TH: React.CSSProperties = { padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' };

/** Prevent CSV injection (CWE-74): prefix dangerous chars with apostrophe */
function sanitizeCSVCell(value: unknown): string {
  const str = String(value ?? '');
  // If cell starts with =, +, -, @, tab, or CR — prepend apostrophe to neutralize formula injection
  if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
  return str;
}

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user)!;
  const { goals, goalSheets, quarterlyUpdates, cycles, thrustAreas } = useDataStore();
  const getCurrentDate = useDemoDateStore((state) => state.getCurrentDate);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>('Q1');
  const [currentPage, setCurrentPage] = useState(0);
  const activeCycle = cycles.find((cycle) => cycle.isActive);

  /**
   * Scope employees by viewer role — critical to prevent cross-team data leak.
   * Admin: all employees. Manager: direct reports only. Employee: self.
   */
  const scopedEmployees = useMemo(() => {
    if (user.role === 'ADMIN') return DEMO_ACCOUNTS.filter((a) => a.role === 'EMPLOYEE');
    if (user.role === 'MANAGER') return DEMO_ACCOUNTS.filter((a) => a.role === 'EMPLOYEE' && a.managerId === user.id);
    return DEMO_ACCOUNTS.filter((a) => a.id === user.id);
  }, [user.id, user.role]);

  const scopeLabel =
    user.role === 'ADMIN' ? 'Organization-wide' :
    user.role === 'MANAGER' ? 'Your direct reports' :
    'Your goals';

  const reportData = useMemo(() => {
    return scopedEmployees
      .flatMap((employee) => {
        const manager = DEMO_ACCOUNTS.find((account) => account.id === employee.managerId);
        const sheet = goalSheets.find(
          (candidate) => candidate.employeeId === employee.id && candidate.cycleId === activeCycle?.id
        );
        const employeeGoals = sheet ? goals.filter((goal) => goal.sheetId === sheet.id) : [];

        return employeeGoals.map((goal) => {
          const update = quarterlyUpdates.find(
            (candidate) => candidate.goalId === goal.id && candidate.quarter === selectedQuarter
          );
          const thrustArea = thrustAreas.find((area) => area.id === goal.thrustAreaId);
          const score =
            update != null
              ? calculateProgressScore({
                  uomType: goal.uomType,
                  target: goal.target,
                  actual: update.actualAchievement ?? 0,
                  targetDate: goal.targetDate,
                  completionDate: update.completionDate,
                })
              : null;

          // Keep numeric and date fields distinct so Excel formats them
          // correctly. Timeline goals fill the *_Date columns; numeric/
          // percentage goals fill the *_Value columns.
          const isTimeline = goal.uomType === 'TIMELINE';
          const plannedDate = isTimeline && goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('en-IN') : '';
          const actualDate = isTimeline && update?.completionDate ? new Date(update.completionDate).toLocaleDateString('en-IN') : '';
          const plannedValue = isTimeline ? '' : goal.target;
          const actualValue = isTimeline ? '' : (update?.actualAchievement ?? '');

          return {
            employee: employee.name,
            manager: manager?.name || '-',
            department: employee.department,
            thrustArea: thrustArea?.name || '-',
            goalTitle: goal.title,
            uom: UOM_LABELS[goal.uomType],
            plannedValue,
            plannedDate,
            actualValue,
            actualDate,
            // Backwards-compat display column used by the table view.
            plannedDisplay: isTimeline ? plannedDate : goal.target,
            actualDisplay: isTimeline ? (actualDate || '-') : (update?.actualAchievement ?? '-'),
            weightage: goal.weightage,
            progress: score != null ? formatScore(score) : '-',
            rawScore: score,
            quarter: selectedQuarter,
            status: update?.status || '-',
          };
        });
      });
  }, [activeCycle?.id, goalSheets, goals, quarterlyUpdates, selectedQuarter, scopedEmployees, thrustAreas]);

  // Stable column definition used by both CSV and Excel for parity.
  const exportColumns: Array<{ header: string; accessor: (row: typeof reportData[number]) => string | number }> = [
    { header: 'Employee', accessor: (r) => r.employee },
    { header: 'Manager', accessor: (r) => r.manager },
    { header: 'Department', accessor: (r) => r.department },
    { header: 'Thrust Area', accessor: (r) => r.thrustArea },
    { header: 'Goal Title', accessor: (r) => r.goalTitle },
    { header: 'UoM', accessor: (r) => r.uom },
    { header: 'Planned Value', accessor: (r) => r.plannedValue },
    { header: 'Planned Deadline', accessor: (r) => r.plannedDate },
    { header: 'Actual Value', accessor: (r) => r.actualValue },
    { header: 'Completion Date', accessor: (r) => r.actualDate },
    { header: 'Weightage (%)', accessor: (r) => r.weightage },
    { header: 'Progress Score', accessor: (r) => r.progress },
    { header: 'Quarter', accessor: (r) => r.quarter },
    { header: 'Status', accessor: (r) => r.status },
  ];

  const handleExportCSV = () => {
    if (reportData.length === 0) { toast.error('No data to export'); return; }
    const headers = exportColumns.map((c) => c.header);
    const rows = reportData.map((row) =>
      exportColumns
        .map((column) => `"${sanitizeCSVCell(column.accessor(row)).replace(/"/g, '""')}"`)
        .join(',')
    );
    // Prepend UTF-8 BOM so Excel auto-detects Unicode characters correctly.
    const csv = `\uFEFF${[headers.join(','), ...rows].join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `Meridian_Achievement_Report_${selectedQuarter}_${getCurrentDate().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV report exported');
  };

  const handleExportExcel = async () => {
    if (reportData.length === 0) { toast.error('No data to export'); return; }
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const rows = reportData.map((row) => {
        const record: Record<string, string | number> = {};
        exportColumns.forEach((column) => { record[column.header] = column.accessor(row); });
        return record;
      });
      const worksheet = XLSX.utils.json_to_sheet(rows, { header: exportColumns.map((c) => c.header) });
      XLSX.utils.book_append_sheet(workbook, worksheet, `${selectedQuarter} Achievement`);
      XLSX.writeFile(workbook, `Meridian_Achievement_Report_${selectedQuarter}.xlsx`);
      toast.success('Excel report exported');
    } catch {
      toast.error('Excel export failed. CSV export is still available.');
    }
  };

  const statusBadge = (status: string) => {
    const s = status.replace(/_/g, ' ');
    const isGood = s === 'COMPLETED' || s === 'ON TRACK';
    return (
      <span style={{
        display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, lineHeight: 1.2,
        background: isGood ? 'color-mix(in srgb, var(--success) 14%, transparent)' : 'var(--bg-surface-hover)',
        border: `1px solid ${isGood ? 'color-mix(in srgb, var(--success) 28%, transparent)' : 'var(--border)'}`,
        color: isGood ? 'var(--success)' : 'var(--text-tertiary)',
      }}>{s}</span>
    );
  };

  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">Reports</p>
          <h1 style={{ margin: '0 0 6px 0' }}>Performance Reports</h1>
          <p className="app-page-meta">
            <span>Planned vs Actual achievement report</span>
            <span className="sep">·</span>
            <span>{activeCycle?.name}</span>
            <span className="sep">·</span>
            <span>{scopeLabel}</span>
          </p>
        </div>
        <div className="app-page-actions">
          <button onClick={handleExportCSV} className="btn-secondary btn-sm">
            Export CSV
          </button>
          <button onClick={handleExportExcel} className="btn-primary btn-sm">
            Export Excel
          </button>
        </div>
      </header>

      {/* Quarter tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'var(--bg-muted)', borderRadius: '10px', width: 'fit-content' }}>
        {QUARTERS.map((quarter) => (
          <button
            key={quarter}
            onClick={() => setSelectedQuarter(quarter)}
            style={{
              height: '32px', padding: '0 16px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 150ms',
              background: selectedQuarter === quarter ? '#fff' : 'transparent',
              color: selectedQuarter === quarter ? '#0f172a' : '#64748b',
              boxShadow: selectedQuarter === quarter ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >{quarter}</button>
        ))}
      </div>

      {/* Data table */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-canvas)' }}>
                <th style={TH}>Employee</th>
                <th style={TH}>Manager</th>
                <th style={TH}>Goal</th>
                <th style={TH}>UoM</th>
                <th style={{ ...TH, textAlign: 'right' }}>Planned</th>
                <th style={{ ...TH, textAlign: 'right' }}>Actual</th>
                <th style={{ ...TH, textAlign: 'right' }}>Score</th>
                <th style={{ ...TH, textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const pagedData = reportData.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
                return pagedData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', fontSize: '14px', color: 'var(--text-tertiary)' }}>
                    No report rows yet. Create goals and submit check-ins to generate exports.
                  </td>
                </tr>
              ) : (
                <>
                {pagedData.map((row, index) => (
                  <tr key={`${row.employee}-${row.goalTitle}-${index}`} style={{ borderBottom: index < pagedData.length - 1 ? '1px solid var(--border)' : 'none' }} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                    <td style={{ ...TD, fontWeight: 500, color: 'var(--text-primary)' }}>{row.employee}</td>
                    <td style={TD}>{row.manager}</td>
                    <td style={{ ...TD, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }} title={row.goalTitle}>{row.goalTitle}</td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>{row.uom.split('(')[0].trim()}</td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.plannedDisplay}</td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.actualDisplay}</td>
                    <td className={cn(row.rawScore != null && getScoreColor(row.rawScore))} style={{ ...TD, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {row.progress}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>{statusBadge(row.status)}</td>
                  </tr>
                ))}
                </>
              );
              })()}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {reportData.length > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, reportData.length)} of {reportData.length}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)}
                style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: '13px', color: currentPage === 0 ? '#cbd5e1' : '#475569', cursor: currentPage === 0 ? 'default' : 'pointer' }}>Prev</button>
              <button disabled={(currentPage + 1) * PAGE_SIZE >= reportData.length} onClick={() => setCurrentPage((p) => p + 1)}
                style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: '13px', color: (currentPage + 1) * PAGE_SIZE >= reportData.length ? '#cbd5e1' : '#475569', cursor: (currentPage + 1) * PAGE_SIZE >= reportData.length ? 'default' : 'pointer' }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
