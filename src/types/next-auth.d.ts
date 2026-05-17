import type { DefaultSession } from 'next-auth';
import type { UserRole } from '@/lib/constants';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id?: string;
      role?: UserRole;
      azureObjectId?: string;
      tenantId?: string;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role?: UserRole;
    azureObjectId?: string;
    tenantId?: string;
  }
}
