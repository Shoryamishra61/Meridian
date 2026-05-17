import { headers } from 'next/headers';
import { USER_ROLES, type UserRole } from '@/lib/constants';
import { auth } from '@/auth';
import { env } from '@/server/config/env';

export interface ApiActor {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

function toRole(value: string | null): UserRole {
  if (value === USER_ROLES.ADMIN || value === USER_ROLES.MANAGER || value === USER_ROLES.EMPLOYEE) return value;
  return USER_ROLES.EMPLOYEE;
}

export async function getApiActor(): Promise<ApiActor | null> {
  if (env.MERIDIAN_AUTH_MODE === 'entra') {
    const session = await auth();
    if (!session?.user?.email) return null;

    return {
      id: session.user.id ?? session.user.email,
      email: session.user.email,
      name: session.user.name ?? session.user.email,
      role: session.user.role ?? USER_ROLES.EMPLOYEE,
    };
  }

  const requestHeaders = await headers();
  const role = toRole(requestHeaders.get('x-meridian-demo-role'));
  const email = requestHeaders.get('x-meridian-demo-email') ?? `${role.toLowerCase()}@meridian-demo.com`;

  return {
    id: requestHeaders.get('x-meridian-demo-user-id') ?? `demo-${role.toLowerCase()}`,
    email,
    name: requestHeaders.get('x-meridian-demo-name') ?? `Demo ${role}`,
    role,
  };
}
