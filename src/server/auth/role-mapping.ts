import { USER_ROLES, type UserRole } from '@/lib/constants';

const groupRoleMap: Array<{ envKey: string; role: UserRole }> = [
  { envKey: 'ENTRA_ADMIN_GROUP_ID', role: USER_ROLES.ADMIN },
  { envKey: 'ENTRA_MANAGER_GROUP_ID', role: USER_ROLES.MANAGER },
  { envKey: 'ENTRA_EMPLOYEE_GROUP_ID', role: USER_ROLES.EMPLOYEE },
];

export function resolveRoleFromEntraClaims(claims: { roles?: unknown; groups?: unknown }): UserRole {
  const appRoles = Array.isArray(claims.roles) ? claims.roles.map(String) : [];
  if (appRoles.includes('Meridian.Admin')) return USER_ROLES.ADMIN;
  if (appRoles.includes('Meridian.Manager')) return USER_ROLES.MANAGER;
  if (appRoles.includes('Meridian.Employee')) return USER_ROLES.EMPLOYEE;

  const groups = Array.isArray(claims.groups) ? claims.groups.map(String) : [];
  for (const mapping of groupRoleMap) {
    const groupId = process.env[mapping.envKey];
    if (groupId && groups.includes(groupId)) return mapping.role;
  }

  return USER_ROLES.EMPLOYEE;
}
