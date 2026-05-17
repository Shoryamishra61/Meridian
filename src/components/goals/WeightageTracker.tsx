/**
 * Meridian — Weightage Tracker
 * Clean progress bar. Color communicates state, not decoration.
 * Brand (in progress) → Green (valid 100%) → Red (over/under critical).
 */

'use client';

import { cn } from '@/lib/utils';
import { BUSINESS_RULES } from '@/lib/constants';
import type { Goal } from '@/types';

interface WeightageTrackerProps {
  goals: Goal[];
  compact?: boolean;
}

export default function WeightageTracker({ goals, compact = false }: WeightageTrackerProps) {
  const total = goals.reduce((sum, g) => sum + g.weightage, 0);
  const isExact = total === BUSINESS_RULES.TOTAL_WEIGHTAGE;
  const isOver = total > BUSINESS_RULES.TOTAL_WEIGHTAGE;
  const remaining = BUSINESS_RULES.TOTAL_WEIGHTAGE - total;

  const textColor = isExact ? 'text-[var(--success)]' : isOver ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]';

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <progress
          value={Math.min(total, 100)}
          max={100}
          className={cn(
            'flex-1 h-1.5 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-[var(--bg-interactive)] [&::-moz-progress-bar]:bg-current',
            isExact && '[&::-webkit-progress-value]:bg-[var(--success)] text-[var(--success)]',
            isOver && '[&::-webkit-progress-value]:bg-[var(--danger)] text-[var(--danger)]',
            !isExact && !isOver && '[&::-webkit-progress-value]:bg-[var(--brand)] text-[var(--brand)]'
          )}
        />
        <span className={cn('text-[12px] font-semibold tabular-nums', textColor)}>{total}%</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium">Weightage</p>
          <span className="text-[11px] text-[var(--text-tertiary)]">{goals.length}/{BUSINESS_RULES.MAX_GOALS_PER_CYCLE} goals</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-lg font-semibold tabular-nums', textColor)}>{total}</span>
          <span className="text-[12px] text-[var(--text-tertiary)]">/ 100%</span>
        </div>
      </div>

      <progress
        value={Math.min(total, 100)}
        max={100}
        className={cn(
          'w-full h-2 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-[var(--bg-interactive)] [&::-moz-progress-bar]:bg-current',
          isExact && '[&::-webkit-progress-value]:bg-[var(--success)] text-[var(--success)]',
          isOver && '[&::-webkit-progress-value]:bg-[var(--danger)] text-[var(--danger)]',
          !isExact && !isOver && '[&::-webkit-progress-value]:bg-[var(--brand)] text-[var(--brand)]'
        )}
        style={{ marginBottom: '6px' }}
      />

      <p className={cn(
        'text-[12px]',
        isExact ? 'text-[var(--success)]' : isOver ? 'text-[var(--danger)]' : 'text-[var(--text-tertiary)]'
      )}>
        {isExact
          ? 'Total is 100%. Ready to submit.'
          : isOver
          ? `Over by ${total - 100}%. Reduce weightage to submit.`
          : `${remaining}% remaining.`}
      </p>
    </div>
  );
}
