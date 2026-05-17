/**
 * Meridian — Math Engine
 * 
 * ⚠️ CANONICAL: These formulas are copied VERBATIM from the ATOMQUEST Problem Statement.
 * DO NOT modify, extend, or add assumptions.
 * 
 * | UoM Type     | Description                    | Formula                       |
 * |-------------|-------------------------------|-------------------------------|
 * | Min         | Higher is better (e.g. Sales) | Achievement ÷ Target          |
 * | Max         | Lower is better (e.g. TAT)    | Target ÷ Achievement          |
 * | Timeline    | Date-based completion          | Completion date vs. Deadline  |
 * | Zero        | Zero = Success                 | If 0 → 100%, else 0%         |
 */

import type { UoMType } from './constants';

export interface ScoreInput {
  uomType: UoMType;
  target: number;
  actual: number;
  targetDate?: Date | string | null;
  completionDate?: Date | string | null;
}

function toFiniteNumber(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function safeRatio(numerator: number, denominator: number): number {
  const ratio = numerator / denominator;
  return Number.isFinite(ratio) && !Number.isNaN(ratio) ? ratio : 0;
}

/**
 * Compute the progress score for a single goal.
 * Returns a decimal ratio (e.g., 0.85 = 85%).
 * 
 * @param input - The score input containing UoM type, target, actual, and dates
 * @returns Progress score as decimal (0-1 range, can exceed 1 for over-achievement)
 */
export function calculateProgressScore(input: ScoreInput): number {
  const { uomType, target, actual, targetDate, completionDate } = input;
  const safeTarget = toFiniteNumber(target);
  const safeActual = toFiniteNumber(actual);

  if (safeTarget == null || safeActual == null) return 0;

  switch (uomType) {
    case 'NUMERIC_MIN': {
      // Higher is better: Achievement ÷ Target
      if (safeTarget === 0) return safeActual === 0 ? 1.0 : 0.0;
      return safeRatio(safeActual, safeTarget);
    }

    case 'PERCENTAGE_MIN': {
      // Higher is better: Achievement ÷ Target
      if (safeTarget === 0) return safeActual === 0 ? 1.0 : 0.0;
      return safeRatio(safeActual, safeTarget);
    }

    case 'NUMERIC_MAX': {
      // Lower is better: Target ÷ Achievement
      if (safeActual === 0) return 1.0; // Zero achievement is perfect for "lower is better"
      if (safeTarget === 0) return 0.0;
      return safeRatio(safeTarget, safeActual);
    }

    case 'PERCENTAGE_MAX': {
      // Lower is better: Target ÷ Achievement
      if (safeActual === 0) return 1.0;
      if (safeTarget === 0) return 0.0;
      return safeRatio(safeTarget, safeActual);
    }

    case 'TIMELINE': {
      // Completion date vs. Deadline
      if (!targetDate || !completionDate) return 0;

      const deadline = targetDate instanceof Date ? targetDate : new Date(targetDate);
      const completed = completionDate instanceof Date ? completionDate : new Date(completionDate);

      if (isNaN(deadline.getTime()) || isNaN(completed.getTime())) return 0;

      // Completed on or before deadline = 100%
      if (completed <= deadline) return 1.0;

      // After deadline = 0% (strict interpretation from PS)
      return 0.0;
    }

    case 'ZERO_BASED': {
      // Zero = Success: If 0 → 100%, else 0%
      return safeActual === 0 ? 1.0 : 0.0;
    }

    default: {
      // Exhaustive check — TypeScript will warn if a case is missed
      const _exhaustive: never = uomType;
      void _exhaustive;
      return 0;
    }
  }
}

/**
 * Compute the weighted score for a single goal.
 * @param score - The raw progress score (0-1 decimal)
 * @param weightage - The goal's weightage percentage (e.g., 25 for 25%)
 * @returns Weighted contribution to overall sheet score
 */
export function calculateWeightedScore(score: number, weightage: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(weightage)) return 0;
  return score * (weightage / 100);
}

/**
 * Compute the overall sheet-level weighted score.
 * Formula: Σ(goal_score × goal_weightage) / 100
 * 
 * @param goals - Array of { score, weightage } pairs
 * @returns Overall sheet score as decimal (0-1)
 */
export function calculateSheetScore(
  goals: Array<{ score: number; weightage: number }>
): number {
  if (goals.length === 0) return 0;

  return goals.reduce((total, goal) => {
    return total + calculateWeightedScore(goal.score, goal.weightage);
  }, 0);
}

/**
 * Calculate department-level average score.
 * @param sheetScores - Array of individual sheet-level scores
 * @returns Average score across all sheets
 */
export function calculateDepartmentScore(sheetScores: number[]): number {
  if (sheetScores.length === 0) return 0;
  const sum = sheetScores.reduce((acc, score) => acc + score, 0);
  return sum / sheetScores.length;
}

/**
 * Format a decimal score for display.
 * @param score - Raw decimal score (e.g., 0.875)
 * @returns Formatted string (e.g., "87.5%")
 */
export function formatScore(score: number): string {
  if (!Number.isFinite(score) || Number.isNaN(score)) return '0.0%';
  return `${(score * 100).toFixed(1)}%`;
}

/**
 * Get score color class based on value.
 * Green ≥ 80%, Yellow 50-79%, Red < 50%
 */
export function getScoreColor(score: number): string {
  if (score >= 0.8) return 'text-[var(--success)]';
  if (score >= 0.5) return 'text-[var(--warning)]';
  return 'text-[var(--danger)]';
}

/**
 * Get score background class based on value.
 */
export function getScoreBgColor(score: number): string {
  if (score >= 0.8) return 'bg-emerald-50';
  if (score >= 0.5) return 'bg-amber-50';
  return 'bg-rose-50';
}

/**
 * Validate weightage values for a goal sheet.
 * @returns Object with validation result and detailed message
 */
export function validateWeightage(
  goals: Array<{ weightage: number }>,
  excludeIndex?: number
): {
  isValid: boolean;
  total: number;
  remaining: number;
  message: string;
} {
  const total = goals.reduce((sum, goal, index) => {
    if (index === excludeIndex) return sum;
    return sum + goal.weightage;
  }, 0);

  const remaining = 100 - total;

  if (total === 100) {
    return {
      isValid: true,
      total,
      remaining: 0,
      message: 'Weightage total is 100%. Ready to submit.',
    };
  }

  if (total < 100) {
    return {
      isValid: false,
      total,
      remaining,
      message: `Weightage total is ${total}%. Add ${remaining}% more across your goals to submit.`,
    };
  }

  return {
    isValid: false,
    total,
    remaining,
    message: `Weightage total exceeds 100% by ${total - 100}%. Reduce weightage to submit.`,
  };
}
