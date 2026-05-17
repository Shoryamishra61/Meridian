/**
 * Meridian - Achievement Reports
 * Clean enterprise table with inline styles. CSV/Excel export.
 */

'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useDataStore } from '@/stores/data-store';
import { useDemoDateStore } from '@/stores/demo-date-store';
import { DEMO_ACCOUNTS, UOM_LABELS, type Quarter } from '@/lib/constants';
import { calculateProgressScore, formatScore, getScoreColor } from '@/lib/calculations';
import { cn } from '@/lib/utils';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
const TH: React.CSSProperties = { padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '12px 16px', fontSize: '13px', color: '#475569' };

export default function ReportsPage() {
  const { goals, goalSheets, quarterlyUpdates, cycles, thrustAreas } = useDataStore();
  const getCurrentDate = useDemoDateStore((state) => state.getCurrentDate);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>('Q1');
  const activeCycle = cycles.find((cycle) => cycle.isActive);

  const reportData = useMemo(() => {
    return DEMO_ACCOUNTS.filter((account) => account.role === 'EMPLOYEE')
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

          return {
            employee: employee.name,
            manager: manager?.name || '-',
            department: employee.department,
            thrustArea: thrustArea?.name || '-',
            goalTitle: goal.title,
            uom: UOM_LABELS[goal.uomType],
            plannedTarget:
              goal.uomType === 'TIMELINE' && goal.targetDate
                ? new Date(goal.targetDate).toLocaleDateString('en-IN')
                : goal.target,
            weightage: goal.weightage,
            actualAchievement:
              goal.uomType === 'TIMELINE' && update?.completionDate
                ? new Date(update.completionDate).toLocaleDateString('en-IN')
                : update?.actualAchievement ?? '-',
            progress: score != null ? formatScore(score) : '-',
            rawScore: score,
            quarter: selectedQuarter,
            status: update?.status || '-',
          };
        });
      });
  }, [activeCycle?.id, goalSheets, goals, quarterlyUpdates, selectedQuarter, thrustAreas]);

  const handleExportCSV = () => {
    if (reportData.length === 0) { toast.error('No data to export'); return; }
    const headers = ['Employee', 'Manager', 'Department', 'Thrust Area', 'Goal Title', 'UoM', 'Planned Target', 'Weightage', 'Actual Achievement', 'Progress Score', 'Quarter', 'Status'];
    const rows = reportData.map((row) =>
      [row.employee, row.manager, row.department, row.thrustArea, row.goalTitle, row.uom, row.plannedTarget, row.weightage, row.actualAchievement, row.progress, row.quarter, row.status]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Meridian_Achievement_Report_${selectedQuarter}_${getCurrentDate().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('CSV report exported');
  };

  const handleExportExcel = async () => {
    if (reportData.length === 0) { toast.error('No data to export'); return; }
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(reportData);
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
        background: isGood ? '#ecfdf5' : '#f8fafc',
        color: isGood ? '#065f46' : '#64748b',
      }}>{s}</span>
    );
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Reports</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Planned vs Actual achievement report for {activeCycle?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportCSV} style={{ height: '36px', padding: '0 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', fontWeight: 500, color: '#475569', cursor: 'pointer' }}>
            Export CSV
          </button>
          <button onClick={handleExportExcel} style={{ height: '36px', padding: '0 14px', borderRadius: '8px', border: 'none', background: '#2563eb', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
            Export Excel
          </button>
        </div>
      </div>

      {/* Quarter tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '4px', background: '#f1f5f9', borderRadius: '10px', width: 'fit-content' }}>
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
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
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
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>
                    No report rows yet. Create goals and submit check-ins to generate exports.
                  </td>
                </tr>
              ) : (
                reportData.map((row, index) => (
                  <tr key={`${row.employee}-${row.goalTitle}-${index}`} style={{ borderBottom: index < reportData.length - 1 ? '1px solid #f1f5f9' : 'none' }} className="hover:bg-slate-50 transition-colors">
                    <td style={{ ...TD, fontWeight: 500, color: '#0f172a' }}>{row.employee}</td>
                    <td style={TD}>{row.manager}</td>
                    <td style={{ ...TD, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }} title={row.goalTitle}>{row.goalTitle}</td>
                    <td style={{ ...TD, fontSize: '12px', color: '#64748b' }}>{row.uom.split('(')[0].trim()}</td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.plannedTarget}</td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.actualAchievement}</td>
                    <td className={cn(row.rawScore != null && getScoreColor(row.rawScore))} style={{ ...TD, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {row.progress}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>{statusBadge(row.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
