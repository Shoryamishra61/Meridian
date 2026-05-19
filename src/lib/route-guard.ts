/**
 * Meridian — Route Guard
 * Centralized role-based route access control.
 * Used by the portal layout to block unauthorized URL access.
 */

import type { UserRole } from './constants';

interface RouteRule {
  /** Path prefix to match */
  path: string;
  /** Roles allowed to access this path */
  allowedRoles: UserRole[];
}

/**
 * Route permission map — ordered from most specific to least specific.
 * The first matching rule wins.
 */
const ROUTE_RULES: RouteRule[] = [
  // Admin-only routes
  { path: '/admin/audit', allowedRoles: ['ADMIN'] },
  { path: '/admin/cycles', allowedRoles: ['ADMIN'] },
  { path: '/admin/integrations', allowedRoles: ['ADMIN'] },
  { path: '/admin/escalations', allowedRoles: ['ADMIN'] },
  { path: '/admin/shared-goals', allowedRoles: ['ADMIN', 'MANAGER'] },

  // Manager-only routes
  { path: '/team', allowedRoles: ['MANAGER'] },

  // Manager + Admin routes
  { path: '/reports', allowedRoles: ['MANAGER', 'ADMIN'] },

  // Employee-specific routes
  { path: '/goals', allowedRoles: ['EMPLOYEE'] },

  // Shared routes
  { path: '/dashboard', allowedRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { path: '/checkins', allowedRoles: ['EMPLOYEE', 'MANAGER'] },
  { path: '/analytics', allowedRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
];

/**
 * Check if a user role can access a given pathname.
 * Returns `true` if access is allowed, `false` if denied.
 * Unknown routes default to allowed (so 404 pages still render).
 */
export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.path));
  if (!rule) return true; // Unknown route — let Next.js handle 404
  return rule.allowedRoles.includes(role);
}

/**
 * Get the default redirect path for a given role.
 */
export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboard';
    case 'MANAGER':
      return '/dashboard';
    case 'EMPLOYEE':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}
