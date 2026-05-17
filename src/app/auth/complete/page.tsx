'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { USER_ROLES, type UserRole } from '@/lib/constants';

interface AuthSessionResponse {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: UserRole;
  };
}

function initialsFromName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'MS';
}

export default function AuthCompletePage() {
  const router = useRouter();
  const setExternalUser = useAuthStore((state) => state.setExternalUser);

  useEffect(() => {
    let active = true;

    async function completeSignIn() {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const session = (await response.json().catch(() => null)) as AuthSessionResponse | null;

      if (!active) return;

      if (!session?.user?.email) {
        toast.error('Microsoft sign-in did not return a valid session');
        router.replace('/');
        return;
      }

      const name = session.user.name || session.user.email;
      setExternalUser({
        id: session.user.id || session.user.email,
        email: session.user.email,
        name,
        role: session.user.role || USER_ROLES.EMPLOYEE,
        department: 'Microsoft Entra',
        managerId: null,
        avatarInitials: initialsFromName(name),
      });

      toast.success('Signed in with Microsoft Entra ID');
      router.replace('/dashboard');
    }

    completeSignIn();

    return () => {
      active = false;
    };
  }, [router, setExternalUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            border: '1px solid #dbeafe',
            background: '#eff6ff',
            margin: '0 auto 14px',
          }}
        />
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
          Completing Microsoft sign-in
        </p>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Preparing your Meridian session...</p>
      </div>
    </div>
  );
}
