'use client';

import { CalendarDays, CheckCircle2, Clock3, TimerReset } from 'lucide-react';
import { DEFAULT_CYCLE_WINDOWS, type CycleWindowConfig } from '@/lib/constants';
import { cn } from '@/lib/utils';

type WindowState = 'past' | 'active' | 'future';

type WindowMeta = CycleWindowConfig & {
  state: WindowState;
  days: number;
  progress: number;
};

function daysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date));
}

function getWindows(currentDate: Date): WindowMeta[] {
  return DEFAULT_CYCLE_WINDOWS.map((window) => {
    const opens = new Date(window.opensAt);
    const closes = new Date(window.closesAt);
    const totalDays = Math.max(1, daysBetween(opens, closes) + 1);

    if (currentDate >= opens && currentDate <= closes) {
      const elapsed = Math.max(0, daysBetween(opens, currentDate) + 1);
      return {
        ...window,
        state: 'active',
        days: Math.max(0, daysBetween(currentDate, closes)),
        progress: Math.min(100, Math.round((elapsed / totalDays) * 100)),
      };
    }

    if (currentDate > closes) {
      return { ...window, state: 'past', days: 0, progress: 100 };
    }

    return {
      ...window,
      state: 'future',
      days: Math.max(0, daysBetween(currentDate, opens)),
      progress: 0,
    };
  });
}

export default function CycleWindowsCard({ currentDate, compact = false }: { currentDate: Date; compact?: boolean }) {
  const windows = getWindows(currentDate);
  const activeWindow = windows.find((window) => window.state === 'active');
  const nextWindow = windows.find((window) => window.state === 'future');
  const heroWindow = activeWindow ?? nextWindow ?? windows[windows.length - 1];

  const heroStatus = activeWindow
    ? `${activeWindow.days}d left`
    : nextWindow
      ? `Opens in ${nextWindow.days}d`
      : 'Cycle closed';

  if (compact) {
    return (
      <div className="card overflow-hidden flex flex-col justify-between h-full" style={{ padding: '24px', minHeight: '136px' }}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <p className="label-sm text-[11px]">Active Window</p>
            <h2 className="mt-1 text-[17px] leading-tight truncate">{heroWindow.name}</h2>
            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
              {shortDate(heroWindow.opensAt)} – {shortDate(heroWindow.closesAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-light)] text-[var(--brand)]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <span className={cn(
              'inline-flex h-6 items-center justify-center rounded-[4px] px-2.5 text-[11px] font-bold tabular-nums',
              activeWindow ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
            )}>
              {heroStatus}
            </span>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-[var(--radius-full)] bg-[var(--bg-wash)]">
          <div
            className={cn('h-full rounded-[var(--radius-full)] transition-all', activeWindow ? 'bg-[var(--brand)]' : 'bg-[var(--text-muted)]')}
            style={{ width: `${heroWindow.progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface-hover)]" style={{ padding: '16px 18px' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="label-sm text-[11px]">Cycle Windows</p>
            <h2 className="mt-1 text-[16px] leading-tight">{heroWindow.name}</h2>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-light)] text-[var(--brand)]">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <span className="min-w-0 truncate font-medium text-[var(--text-secondary)]">
              {shortDate(heroWindow.opensAt)} - {shortDate(heroWindow.closesAt)}
            </span>
            <span className={cn(
              'inline-flex h-[22px] min-w-[48px] shrink-0 items-center justify-center rounded-[4px] px-2 text-[10px] font-bold tabular-nums',
              activeWindow ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
            )}>
              {heroStatus}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-[var(--radius-full)] bg-[var(--bg-wash)]">
            <div
              className={cn(
                'h-full rounded-[var(--radius-full)] transition-all',
                activeWindow ? 'bg-[var(--brand)]' : 'bg-[var(--text-muted)]'
              )}
              style={{ width: `${heroWindow.progress}%` }}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '10px' }}>
        {windows.map((window) => {
          const Icon = window.state === 'past' ? CheckCircle2 : window.state === 'active' ? TimerReset : Clock3;

          return (
            <div
              key={window.name}
              className={cn(
                'grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2.5 transition-colors',
                window.state === 'active' ? 'bg-[var(--brand-light)]' : 'hover:bg-[var(--bg-surface-hover)]'
              )}
            >
              <div className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px]',
                window.state === 'past' && 'bg-[var(--success-bg)] text-[var(--success)]',
                window.state === 'active' && 'bg-[var(--brand)] text-white',
                window.state === 'future' && 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>

              <div className="min-w-0">
                <p className={cn(
                  'truncate text-[13px] font-semibold leading-tight',
                  window.state === 'active' ? 'text-[var(--brand-hover)]' : 'text-[var(--text-primary)]'
                )}>
                  {window.name}
                </p>
                <p className="mt-1 truncate text-[11px] leading-tight text-[var(--text-secondary)]">
                  {shortDate(window.opensAt)} - {shortDate(window.closesAt)}
                </p>
              </div>

              <span className={cn(
                'inline-flex h-[22px] min-w-[42px] shrink-0 items-center justify-center rounded-[4px] px-2 text-[11px] font-bold tabular-nums',
                window.state === 'past' && 'bg-[var(--bg-muted)] text-[var(--text-secondary)]',
                window.state === 'active' && 'bg-[var(--brand)] text-white',
                window.state === 'future' && 'bg-[var(--bg-muted)] text-[var(--text-primary)]'
              )}>
                {window.state === 'active' ? 'Active' : window.state === 'past' ? 'Done' : `${window.days}d`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
