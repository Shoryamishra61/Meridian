/**
 * Meridian — Sidebar Navigation
 * Desktop: Left sidebar with icons + labels.
 * Mobile: Bottom tab bar with icons.
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useDemoDateStore, type DemoScenario } from '@/stores/demo-date-store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Target,
  ClipboardCheck,
  BarChart3,
  Users,
  FileText,
  Shield,
  AlertTriangle,
  Settings,
  PlugZap,
  LogOut,
  Sparkles,
  Moon,
  Sun,
  RefreshCcw,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { label: 'My Goals', href: '/goals', icon: Target, roles: ['EMPLOYEE'] },
  { label: 'Team Goals', href: '/team', icon: Users, roles: ['MANAGER'] },
  { label: 'Check-ins', href: '/checkins', icon: ClipboardCheck, roles: ['EMPLOYEE', 'MANAGER'] },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { label: 'Reports', href: '/reports', icon: FileText, roles: ['MANAGER', 'ADMIN'] },
  { label: 'Shared Goals', href: '/admin/shared-goals', icon: Sparkles, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Integrations', href: '/admin/integrations', icon: PlugZap, roles: ['ADMIN'] },
  { label: 'Audit Trail', href: '/admin/audit', icon: Shield, roles: ['ADMIN'] },
  { label: 'Escalations', href: '/admin/escalations', icon: AlertTriangle, roles: ['ADMIN'] },
  { label: 'Cycle Settings', href: '/admin/cycles', icon: Settings, roles: ['ADMIN'] },
];

const SCENARIOS: { id: DemoScenario; label: string }[] = [
  { id: 'goal_setting', label: 'May — Goal Setting' },
  { id: 'q1_checkin', label: 'Jul — Q1 Check-in' },
  { id: 'q2_checkin', label: 'Oct — Q2 Check-in' },
  { id: 'q3_checkin', label: 'Jan — Q3 Check-in' },
  { id: 'q4_annual', label: 'Mar — Q4 Annual' },
  { id: 'between_windows', label: 'Jun — Between Windows' },
  { id: 'real_date', label: 'Real Date' },
];

const THEME_STORAGE_KEY = 'meridian-theme-choice';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, switchUser, getDemoAccounts } = useAuthStore();
  const resetToSeed = useDataStore((state) => state.resetToSeed);
  const { overrideDate, setScenario } = useDemoDateStore();
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) === 'dark' : false
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  if (!user) return null;

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
  };

  const demoAccounts = getDemoAccounts();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const getMobileLabel = (label: string) => {
    const labels: Record<string, string> = {
      Dashboard: 'Home',
      'My Goals': 'Goals',
      'Team Goals': 'Team',
      'Check-ins': 'Check-ins',
      Analytics: 'Analytics',
      Reports: 'Reports',
      'Shared Goals': 'Shared',
      Integrations: 'Integrations',
      'Audit Trail': 'Audit',
      Escalations: 'Escalations',
      'Cycle Settings': 'Cycles',
    };
    return labels[label] ?? label;
  };

  const getScenarioFromDate = (date: string | null): DemoScenario => {
    if (!date) return 'real_date';
    const map: Record<string, DemoScenario> = {
      '2025-05-15': 'goal_setting', '2025-07-15': 'q1_checkin', '2025-10-15': 'q2_checkin',
      '2026-01-15': 'q3_checkin', '2026-03-15': 'q4_annual', '2025-06-15': 'between_windows',
    };
    return map[date] || 'real_date';
  };

  return (
    <aside className="portal-sidebar flex flex-col overflow-y-auto overflow-x-hidden">
      {/* ═══ Desktop: Logo ═══ */}
      <div className="hidden lg:flex items-center gap-3 h-16 border-b border-[var(--border)] shrink-0" style={{ padding: '0 16px' }}>
        <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center shadow-sm">
          <Target className="w-4 h-4 text-white" />
        </div>
        <span className="text-[16px] font-bold tracking-tight text-[var(--text-primary)]">Meridian</span>
      </div>

      {/* ═══ Mobile: Horizontal icon bar ═══ */}
      <nav className="mobile-tab-bar lg:hidden" aria-label="Mobile navigation">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'mobile-tab-item',
                isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{getMobileLabel(item.label)}</span>
            </button>
          );
        })}
      </nav>

      {/* ═══ Desktop: Navigation ═══ */}
      <nav className="hidden lg:block flex-1 overflow-y-auto py-4" style={{ padding: '16px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  'w-full flex items-center gap-3 h-11 px-3 rounded-[var(--radius-md)] text-left text-[15px] font-semibold transition-all duration-200',
                  isActive
                    ? 'text-[var(--brand)] bg-transparent'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-wash)] hover:text-[var(--text-primary)]'
                )}
              >
                <Icon className={cn('w-[18px] h-[18px] shrink-0', isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]')} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ═══ Desktop: Demo Controls ═══ */}
      <div className="hidden lg:flex flex-col border-t border-[var(--border)] shrink-0" style={{ padding: '12px 16px', gap: '10px' }}>
        <div>
          <label className="label-sm block" style={{ marginBottom: '4px' }}>Demo Date</label>
          <select
            value={getScenarioFromDate(overrideDate)}
            onChange={(e) => setScenario(e.target.value as DemoScenario)}
            className="input !h-8 !text-[12px] !px-2 w-full"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-sm block" style={{ marginBottom: '4px' }}>Switch Role</label>
          <select
            value={user.id}
            onChange={(e) => { switchUser(e.target.value); router.push('/dashboard'); }}
            className="input !h-8 !text-[12px] !px-2 w-full"
          >
            {demoAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.role.charAt(0) + acc.role.slice(1).toLowerCase()})
              </option>
            ))}
          </select>
        </div>
        {/* Dark Mode + Cmd+K */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={toggleDark}
            className="flex items-center justify-center gap-1.5 flex-1 h-8 rounded-[var(--radius-sm)] text-[11px] font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {isDark ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event('meridian:open-search'))}
            className="flex items-center justify-center gap-1 flex-1 h-8 rounded-[var(--radius-sm)] text-[11px] font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            title="Open search"
            aria-label="Open search"
          >
            ⌘K
          </button>
        </div>
        <button
          onClick={() => resetToSeed()}
          className="flex items-center justify-center gap-1.5 h-8 rounded-[var(--radius-sm)] text-[11px] font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          title="Reset demo data"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Reset demo data
        </button>
      </div>

      {/* ═══ Desktop: User ═══ */}
      <div className="hidden lg:flex items-center gap-2.5 border-t border-[var(--border)] shrink-0" style={{ padding: '10px 16px' }}>
        <div className="w-9 h-9 rounded-full bg-[var(--brand-light)] text-[var(--brand)] text-[13px] font-bold flex items-center justify-center shrink-0">
          {user.avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate">{user.name}</p>
          <p className="text-[11px] text-[var(--text-muted)] truncate">{user.department}</p>
        </div>
        <button
          onClick={() => { logout(); router.push('/'); }}
          className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-all"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
