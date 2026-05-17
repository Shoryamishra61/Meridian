/**
 * Meridian — Auth Store (Zustand)
 * Handles mock authentication for demo mode.
 * Manages current user, role switching, and session state.
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEMO_ACCOUNTS, type UserRole } from '@/lib/constants';

interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  managerId: string | null;
  avatarInitials: string;
}

interface AuthState {
  /** Currently logged-in user (null if not authenticated) */
  user: DemoUser | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Login with email (demo mode — no password verification) */
  login: (email: string) => boolean;
  /** Hydrate from a production SSO session */
  setExternalUser: (user: DemoUser) => void;
  /** Switch role for demo purposes (instant role switch dropdown) */
  switchUser: (userId: string) => void;
  /** Log out */
  logout: () => void;
  /** Get all demo accounts */
  getDemoAccounts: () => readonly DemoUser[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (email: string) => {
        const normalizedLogin = email.trim().toLowerCase();
        const account = DEMO_ACCOUNTS.find((acc) => {
          const documentedEmail = acc.email.replace('@meridian.app', '@meridian-demo.com').toLowerCase();
          return (
            acc.email.toLowerCase() === normalizedLogin ||
            documentedEmail === normalizedLogin ||
            acc.id.toLowerCase() === normalizedLogin ||
            acc.role.toLowerCase() === normalizedLogin
          );
        });
        if (account) {
          set({
            user: { ...account },
            isAuthenticated: true,
          });
          return true;
        }
        return false;
      },

      setExternalUser: (user: DemoUser) => {
        set({
          user,
          isAuthenticated: true,
        });
      },

      switchUser: (userId: string) => {
        const account = DEMO_ACCOUNTS.find((acc) => acc.id === userId);
        if (account) {
          set({
            user: { ...account },
            isAuthenticated: true,
          });
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      getDemoAccounts: () => DEMO_ACCOUNTS,
    }),
    {
      name: 'meridian-auth',
    }
  )
);
