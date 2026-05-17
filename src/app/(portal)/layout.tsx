/**
 * Meridian — Portal Layout
 * Clean content shell. Sidebar + scrollable main content.
 * Includes ErrorBoundary for graceful error recovery.
 */

'use client';

import { useEffect, Component, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import Sidebar from '@/components/layout/Sidebar';
import GlobalSearch from '@/components/ui/GlobalSearch';

/* ── Error Boundary ── */
interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class PortalErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '24px' }}>
          <div style={{ textAlign: 'center', maxWidth: '440px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>Something went wrong</h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.6 }}>
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ height: '36px', padding: '0 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.replace('/');
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <GlobalSearch />
      <main className="portal-main">
        <div className="portal-container">
          <PortalErrorBoundary>
            {children}
          </PortalErrorBoundary>
        </div>
      </main>
    </div>
  );
}
