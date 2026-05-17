import { USER_ROLES, type UserRole } from '@/lib/constants';

export type Permission =
  | 'goals:create'
  | 'goals:submit'
  | 'goals:approve'
  | 'goals:unlock'
  | 'checkins:update'
  | 'checkins:manager-comment'
  | 'reports:export'
  | 'admin:manage-cycles'
  | 'admin:manage-integrations'
  | 'admin:view-audit';

const rolePermissions: Record<UserRole, Permission[]> = {
  [USER_ROLES.EMPLOYEE]: ['goals:create', 'goals:submit', 'checkins:update'],
  [USER_ROLES.MANAGER]: [
    'goals:create',
    'goals:submit',
    'goals:approve',
    'checkins:update',
    'checkins:manager-comment',
    'reports:export',
  ],
  [USER_ROLES.ADMIN]: [
    'goals:create',
    'goals:submit',
    'goals:approve',
    'goals:unlock',
    'checkins:update',
    'checkins:manager-comment',
    'reports:export',
    'admin:manage-cycles',
    'admin:manage-integrations',
    'admin:view-audit',
  ],
};

export function can(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function assertPermission(role: UserRole, permission: Permission) {
  if (!can(role, permission)) {
    return {
      ok: false as const,
      status: 403,
      code: 'FORBIDDEN',
      message: `Role ${role} cannot perform ${permission}.`,
    };
  }

  return { ok: true as const };
}
