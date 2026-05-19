/**
 * Meridian — Service Worker Registration & Connection Status
 * Registers the SW on mount, monitors online/offline state,
 * and shows a non-intrusive banner when the user goes offline.
 */

'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegistration() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[Meridian] SW registered, scope:', reg.scope);
        })
        .catch((err) => {
          console.log('[Meridian] SW registration failed:', err);
        });
    }

    // Monitor connection status
    const handleOnline = () => {
      setIsOffline(false);
      setShowBanner(true);
      // Auto-hide reconnected banner after 3s
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className="connection-status-banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: isOffline
          ? 'linear-gradient(90deg, #f59e0b, #d97706)'
          : 'linear-gradient(90deg, #10b981, #059669)',
        color: 'var(--text-inverse)',
        transition: 'all 300ms ease',
        animation: 'slideDown 300ms ease-out',
      }}
    >
      <span style={{ fontSize: '16px' }}>{isOffline ? '⚡' : '✅'}</span>
      {isOffline
        ? 'You are offline — cached data is available. Changes will sync when reconnected.'
        : 'Back online — all changes synced.'}
      {!isOffline && (
        <button
          onClick={() => setShowBanner(false)}
          style={{
            marginLeft: '8px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '4px',
            padding: '2px 8px',
            color: 'var(--text-inverse)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ✕
        </button>
      )}
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
