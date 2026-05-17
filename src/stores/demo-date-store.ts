/**
 * Meridian — Demo Date Provider
 * 
 * NON-NEGOTIABLE: All date checks throughout the app use this provider
 * instead of raw `new Date()`. This allows demonstrating quarterly windows
 * (e.g., simulate "July" for Q1 check-in) during the hackathon demo.
 * 
 * Feature-flagged: Only shows the date picker UI when DEMO_MODE=true.
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DemoDateState {
  /** The simulated current date (null = use real date) */
  overrideDate: string | null;
  /** Whether demo mode is active */
  isDemoMode: boolean;
  /** Set a demo date override */
  setDemoDate: (date: string | null) => void;
  /** Get the current effective date (override or real) */
  getCurrentDate: () => Date;
  /** Quick-set to predefined demo scenarios */
  setScenario: (scenario: DemoScenario) => void;
}

export type DemoScenario =
  | 'goal_setting'    // May — Goal creation window
  | 'q1_checkin'      // July — Q1 check-in
  | 'q2_checkin'      // October — Q2 check-in
  | 'q3_checkin'      // January — Q3 check-in
  | 'q4_annual'       // March — Q4 final
  | 'between_windows' // June — between goal setting and Q1
  | 'real_date';      // Use actual system date

const SCENARIO_DATES: Record<DemoScenario, string | null> = {
  goal_setting: '2025-05-15',
  q1_checkin: '2025-07-15',
  q2_checkin: '2025-10-15',
  q3_checkin: '2026-01-15',
  q4_annual: '2026-03-15',
  between_windows: '2025-06-15',
  real_date: null,
};

export const useDemoDateStore = create<DemoDateState>()(
  persist(
    (set, get) => ({
      overrideDate: null,
      isDemoMode: true, // Always on for hackathon

      setDemoDate: (date: string | null) => {
        set({ overrideDate: date });
      },

      getCurrentDate: () => {
        const state = get();
        if (state.overrideDate) {
          return new Date(state.overrideDate);
        }
        return new Date();
      },

      setScenario: (scenario: DemoScenario) => {
        set({ overrideDate: SCENARIO_DATES[scenario] });
      },
    }),
    {
      name: 'meridian-demo-date',
    }
  )
);

/**
 * Hook to get the current effective date.
 * Use this instead of `new Date()` everywhere.
 */
export function useCurrentDate(): Date {
  const getCurrentDate = useDemoDateStore((s) => s.getCurrentDate);
  return getCurrentDate();
}
