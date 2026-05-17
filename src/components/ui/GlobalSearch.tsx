/**
 * Meridian — Global Search (Cmd+K)
 * Quick-access search modal for goals, employees, and pages.
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/data-store';
import { useAuthStore } from '@/stores/auth-store';
import { DEMO_ACCOUNTS } from '@/lib/constants';

interface SearchResult {
  type: 'page' | 'employee' | 'goal';
  title: string;
  subtitle: string;
  href: string;
  icon: string;
}

const PAGES: SearchResult[] = [
  { type: 'page', title: 'Dashboard', subtitle: 'Manager overview', href: '/dashboard', icon: '📊' },
  { type: 'page', title: 'My Goals', subtitle: 'Create & manage goals', href: '/goals', icon: '🎯' },
  { type: 'page', title: 'Team Goals', subtitle: 'Review team submissions', href: '/team', icon: '👥' },
  { type: 'page', title: 'Check-ins', subtitle: 'Quarterly progress updates', href: '/checkins', icon: '📋' },
  { type: 'page', title: 'Analytics', subtitle: 'Performance intelligence', href: '/analytics', icon: '📈' },
  { type: 'page', title: 'Reports', subtitle: 'Export achievement data', href: '/reports', icon: '📄' },
  { type: 'page', title: 'Shared Goals', subtitle: 'Departmental KPIs', href: '/admin/shared-goals', icon: '🔗' },
  { type: 'page', title: 'Audit Trail', subtitle: 'Change history', href: '/admin/audit', icon: '🔍' },
  { type: 'page', title: 'Escalations', subtitle: 'Rule-based follow-up', href: '/admin/escalations', icon: '⚡' },
  { type: 'page', title: 'Cycle Settings', subtitle: 'Schedule & exceptions', href: '/admin/cycles', icon: '⚙️' },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { goals } = useDataStore();
  const user = useAuthStore((s) => s.user);

  // Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!open) {
          setQuery('');
          setSelectedIndex(0);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
        setOpen(!open);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return PAGES.slice(0, 6);
    const q = query.toLowerCase();

    const pageResults = PAGES.filter((p) => p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q));

    const employeeResults: SearchResult[] = DEMO_ACCOUNTS
      .filter((a) => a.name.toLowerCase().includes(q) || a.department.toLowerCase().includes(q))
      .map((a) => ({ type: 'employee' as const, title: a.name, subtitle: `${a.department} · ${a.role}`, href: '/team', icon: '👤' }));

    const goalResults: SearchResult[] = goals
      .filter((g) => g.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map((g) => ({ type: 'goal' as const, title: g.title, subtitle: `Weight: ${g.weightage}%`, href: '/goals', icon: '🎯' }));

    return [...pageResults, ...employeeResults, ...goalResults].slice(0, 8);
  }, [query, goals]);

  const navigate = (result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIndex]) { navigate(results[selectedIndex]); }
  };

  if (!open || !user) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}>
      {/* Backdrop */}
      <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }} />

      {/* Modal */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '520px', margin: '0 16px', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 24px 48px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '18px', color: '#94a3b8' }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, employees, goals..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#0f172a', fontFamily: 'inherit', background: 'transparent' }}
          />
          <kbd style={{ padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '6px 0' }}>
          {results.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No results found</div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.title}-${i}`}
                onClick={() => navigate(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 18px',
                  border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  background: i === selectedIndex ? '#eff6ff' : 'transparent',
                  transition: 'background 100ms',
                }}
              >
                <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{r.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{r.subtitle}</p>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 6px', borderRadius: '4px', background: '#f8fafc' }}>{r.type}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '12px', padding: '10px 18px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>↑↓ Navigate</span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>↵ Select</span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
