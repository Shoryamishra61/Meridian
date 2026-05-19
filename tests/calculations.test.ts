/**
 * Meridian — Math Engine Tests (BRD §2.2 UoM Formulas)
 */
import { describe, it, expect } from 'vitest';
import { calculateProgressScore, validateWeightage, calculateWeightedScore, calculateSheetScore, calculateDepartmentScore, formatScore, getScoreColor } from '@/lib/calculations';

describe('BRD §2.2 — UoM Progress Formulas', () => {
  describe('NUMERIC_MIN (Higher is better: Achievement ÷ Target)', () => {
    it('TC-001: exact target → 100%', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: 100, target: 100 })).toBe(1.0));
    it('TC-002: half target → 50%', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: 50, target: 100 })).toBe(0.5));
    it('TC-003: over target → >100%', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: 120, target: 100 })).toBe(1.2));
    it('TC-004: zero actual → 0%', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: 0, target: 100 })).toBe(0));
    it('TC-005: zero target, zero actual → 100%', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: 0, target: 0 })).toBe(1.0));
    it('TC-006: zero target, nonzero actual → 0%', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: 50, target: 0 })).toBe(0));
    it('TC-007: decimal values', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: 4.6, target: 4.6 })).toBe(1.0));
    it('TC-008: very small decimal', () => { const r = calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: 0.001, target: 1 }); expect(r).toBeCloseTo(0.001); });
    it('TC-009: large numbers', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: 1000000, target: 500000 })).toBe(2.0));
    it('TC-010: negative actual → finite', () => { const r = calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: -10, target: 100 }); expect(Number.isFinite(r)).toBe(true); });
  });

  describe('PERCENTAGE_MIN (Higher is better)', () => {
    it('TC-011: 92% of 92% target → 100%', () => expect(calculateProgressScore({ uomType: 'PERCENTAGE_MIN', actual: 92, target: 92 })).toBe(1.0));
    it('TC-012: 88 of 92 → ~95.6%', () => expect(calculateProgressScore({ uomType: 'PERCENTAGE_MIN', actual: 88, target: 92 })).toBeCloseTo(88/92));
    it('TC-013: 100 of 92 → >100%', () => expect(calculateProgressScore({ uomType: 'PERCENTAGE_MIN', actual: 100, target: 92 })).toBeCloseTo(100/92));
    it('TC-014: 0 actual → 0', () => expect(calculateProgressScore({ uomType: 'PERCENTAGE_MIN', actual: 0, target: 92 })).toBe(0));
    it('TC-015: zero target zero actual → 100%', () => expect(calculateProgressScore({ uomType: 'PERCENTAGE_MIN', actual: 0, target: 0 })).toBe(1.0));
  });

  describe('NUMERIC_MAX (Lower is better: Target ÷ Achievement)', () => {
    it('TC-016: exact target → 100%', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MAX', actual: 48, target: 48 })).toBe(1.0));
    it('TC-017: lower actual → >100%', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MAX', actual: 40, target: 48 })).toBe(48/40));
    it('TC-018: higher actual → <100%', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MAX', actual: 60, target: 48 })).toBe(48/60));
    it('TC-019: zero actual → 100%', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MAX', actual: 0, target: 48 })).toBe(1.0));
    it('TC-020: zero target → 0%', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MAX', actual: 10, target: 0 })).toBe(0));
  });

  describe('PERCENTAGE_MAX (Lower is better)', () => {
    it('TC-021: exact → 100%', () => expect(calculateProgressScore({ uomType: 'PERCENTAGE_MAX', actual: 4, target: 4 })).toBe(1.0));
    it('TC-022: lower → >100%', () => expect(calculateProgressScore({ uomType: 'PERCENTAGE_MAX', actual: 3.7, target: 4 })).toBeCloseTo(4/3.7));
    it('TC-023: higher → <100%', () => expect(calculateProgressScore({ uomType: 'PERCENTAGE_MAX', actual: 4.8, target: 4 })).toBeCloseTo(4/4.8));
    it('TC-024: zero actual → 100%', () => expect(calculateProgressScore({ uomType: 'PERCENTAGE_MAX', actual: 0, target: 4 })).toBe(1.0));
    it('TC-025: zero target → 0%', () => expect(calculateProgressScore({ uomType: 'PERCENTAGE_MAX', actual: 5, target: 0 })).toBe(0));
  });

  describe('TIMELINE (Date-based completion)', () => {
    it('TC-026: completed before deadline → 100%', () => expect(calculateProgressScore({ uomType: 'TIMELINE', actual: 0, target: 0, targetDate: '2025-09-30', completionDate: '2025-09-12' })).toBe(1.0));
    it('TC-027: completed on deadline → 100%', () => expect(calculateProgressScore({ uomType: 'TIMELINE', actual: 0, target: 0, targetDate: '2025-09-30', completionDate: '2025-09-30' })).toBe(1.0));
    it('TC-028: completed after deadline → 0%', () => expect(calculateProgressScore({ uomType: 'TIMELINE', actual: 0, target: 0, targetDate: '2025-09-30', completionDate: '2025-10-01' })).toBe(0));
    it('TC-029: no completion date → 0%', () => expect(calculateProgressScore({ uomType: 'TIMELINE', actual: 0, target: 0, targetDate: '2025-09-30' })).toBe(0));
    it('TC-030: no target date → 0%', () => expect(calculateProgressScore({ uomType: 'TIMELINE', actual: 0, target: 0, completionDate: '2025-09-12' })).toBe(0));
    it('TC-031: both null → 0%', () => expect(calculateProgressScore({ uomType: 'TIMELINE', actual: 0, target: 0 })).toBe(0));
    it('TC-032: Date objects', () => expect(calculateProgressScore({ uomType: 'TIMELINE', actual: 0, target: 0, targetDate: new Date('2025-09-30'), completionDate: new Date('2025-09-12') })).toBe(1.0));
  });

  describe('ZERO_BASED (Zero = Success)', () => {
    it('TC-033: zero actual → 100%', () => expect(calculateProgressScore({ uomType: 'ZERO_BASED', actual: 0, target: 0 })).toBe(1.0));
    it('TC-034: nonzero actual → 0%', () => expect(calculateProgressScore({ uomType: 'ZERO_BASED', actual: 1, target: 0 })).toBe(0));
    it('TC-035: large nonzero → 0%', () => expect(calculateProgressScore({ uomType: 'ZERO_BASED', actual: 999, target: 0 })).toBe(0));
    it('TC-036: negative actual → 0%', () => expect(calculateProgressScore({ uomType: 'ZERO_BASED', actual: -1, target: 0 })).toBe(0));
  });

  describe('Division-by-zero guards', () => {
    it('TC-037: NaN target → 0', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: 50, target: NaN })).toBe(0));
    it('TC-038: NaN actual → 0', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: NaN, target: 100 })).toBe(0));
    it('TC-039: Infinity target → 0', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: 50, target: Infinity })).toBe(0));
    it('TC-040: Infinity actual → 0', () => expect(calculateProgressScore({ uomType: 'NUMERIC_MIN', actual: Infinity, target: 100 })).toBe(0));
  });
});

describe('Weightage Validation (BRD §2.1)', () => {
  it('TC-041: exactly 100% → valid', () => { const r = validateWeightage([{ weightage: 40 }, { weightage: 30 }, { weightage: 30 }]); expect(r.isValid).toBe(true); expect(r.total).toBe(100); });
  it('TC-042: under 100% → invalid', () => { const r = validateWeightage([{ weightage: 40 }, { weightage: 30 }]); expect(r.isValid).toBe(false); expect(r.remaining).toBe(30); });
  it('TC-043: over 100% → invalid', () => { const r = validateWeightage([{ weightage: 60 }, { weightage: 50 }]); expect(r.isValid).toBe(false); });
  it('TC-044: single goal 100% → valid', () => expect(validateWeightage([{ weightage: 100 }]).isValid).toBe(true));
  it('TC-045: empty goals → invalid', () => expect(validateWeightage([]).isValid).toBe(false));
  it('TC-046: 8 goals at 12.5% → valid', () => { const goals = Array(8).fill({ weightage: 12.5 }); expect(validateWeightage(goals).isValid).toBe(true); });
  it('TC-047: excludeIndex works', () => { const r = validateWeightage([{ weightage: 50 }, { weightage: 50 }, { weightage: 20 }], 2); expect(r.total).toBe(100); });
  it('TC-048: message includes percentage', () => { const r = validateWeightage([{ weightage: 40 }]); expect(r.message).toContain('60%'); });
});

describe('Weighted & Sheet Scores', () => {
  it('TC-049: weighted score calculation', () => expect(calculateWeightedScore(0.8, 40)).toBeCloseTo(0.32));
  it('TC-050: weighted score with 100% weight', () => expect(calculateWeightedScore(1.0, 100)).toBe(1.0));
  it('TC-051: weighted score with 0 score', () => expect(calculateWeightedScore(0, 50)).toBe(0));
  it('TC-052: NaN guard', () => expect(calculateWeightedScore(NaN, 50)).toBe(0));
  it('TC-053: sheet score aggregation', () => { const r = calculateSheetScore([{ score: 0.8, weightage: 40 }, { score: 1.0, weightage: 60 }]); expect(r).toBeCloseTo(0.92); });
  it('TC-054: empty sheet → 0', () => expect(calculateSheetScore([])).toBe(0));
  it('TC-055: dept score avg', () => expect(calculateDepartmentScore([0.8, 0.9, 1.0])).toBeCloseTo(0.9));
  it('TC-056: empty dept → 0', () => expect(calculateDepartmentScore([])).toBe(0));
});

describe('Display Helpers', () => {
  it('TC-057: formatScore 0.875 → "87.5%"', () => expect(formatScore(0.875)).toBe('87.5%'));
  it('TC-058: formatScore 0 → "0.0%"', () => expect(formatScore(0)).toBe('0.0%'));
  it('TC-059: formatScore 1 → "100.0%"', () => expect(formatScore(1)).toBe('100.0%'));
  it('TC-060: formatScore NaN → "0.0%"', () => expect(formatScore(NaN)).toBe('0.0%'));
  it('TC-061: green ≥80%', () => expect(getScoreColor(0.85)).toContain('success'));
  it('TC-062: yellow 50-79%', () => expect(getScoreColor(0.65)).toContain('warning'));
  it('TC-063: red <50%', () => expect(getScoreColor(0.3)).toContain('danger'));
});
