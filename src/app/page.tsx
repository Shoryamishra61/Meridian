/**
 * Meridian — Login Page
 * 
 * Design: Clean, functional, trustworthy. Inspired by Linear's login.
 * No gradients. No glow. No aspirational copy. Just the task.
 * 
 * Primary action: Sign in. Everything else is secondary.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 400));

    const success = login(email);
    if (success) {
      toast.success('Signed in successfully');
      setTimeout(() => router.push('/dashboard'), 200);
    } else {
      toast.error('Invalid demo login', {
        description: 'Use an email, user id, or role name from the demo accounts below.',
      });
      setIsLoading(false);
    }
  };

  const quickLogin = (demoEmail: string) => {
    login(demoEmail);
    toast.success('Signed in');
    setTimeout(() => router.push('/dashboard'), 200);
  };

  const roleAccounts = [
    { ...DEMO_ACCOUNTS.find((a) => a.id === 'emp-priya-001')!, label: 'Employee' },
    { ...DEMO_ACCOUNTS.find((a) => a.id === 'mgr-arjun-001')!, label: 'Manager' },
    { ...DEMO_ACCOUNTS.find((a) => a.id === 'admin-kavya-001')!, label: 'Admin' },
  ];

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* ═══ Left Side: Brand Area (Hidden on Mobile) ═══ */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-[var(--brand)] relative overflow-hidden flex-col justify-between"
        style={{ padding: '6rem 8rem' }}
      >
        {/* Subtle background pattern or gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-900 opacity-90 z-0 pointer-events-none" />
        
        {/* Logo Top Left */}
        <div className="relative z-10 flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="6" fill="white" fillOpacity="0.2" />
            <path d="M14 7L14 21M7 14L21 14M9.5 9.5L18.5 18.5M18.5 9.5L9.5 18.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-xl font-bold tracking-tight text-white">Meridian</span>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 my-auto max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Align your organization.<br />Accelerate performance.
          </h1>
          <p className="text-lg text-blue-100 font-medium max-w-md">
            The enterprise goal setting and tracking portal that connects daily execution with strategic vision.
          </p>
        </div>

        {/* Footer Text */}
        <div className="relative z-10 text-blue-200 text-[13px] font-medium">
          © {new Date().getFullYear()} Atomberg Technologies
        </div>
      </div>

      {/* ═══ Right Side: Login Form ═══ */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-8 sm:px-12">
        <div className="w-full max-w-[400px]">
          
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="6" fill="var(--brand)" />
              <path d="M14 7L14 21M7 14L21 14M9.5 9.5L18.5 18.5M18.5 9.5L9.5 18.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9"/>
            </svg>
            <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Meridian</span>
          </div>

          {/* Headers */}
          <div style={{ marginBottom: '20px' }}>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]" style={{ marginBottom: '6px' }}>Sign in</h2>
            <p className="text-[14px] text-[var(--text-secondary)]">
              Welcome back. Please enter your details.
            </p>
          </div>

          {/* Microsoft SSO button */}
          <div style={{ marginBottom: '18px' }}>
            <button
              type="button"
              onClick={() => quickLogin(DEMO_ACCOUNTS[0].email)}
              className="w-full flex items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-wash)] transition-colors shadow-sm"
              style={{ height: '44px' }}
            >
              <svg width="18" height="18" viewBox="0 0 23 23" fill="none">
                <path d="M11 0H0V11H11V0Z" fill="#F25022" />
                <path d="M23 0H12V11H23V0Z" fill="#7FBA00" />
                <path d="M11 12H0V23H11V12Z" fill="#00A4EF" />
                <path d="M23 12H12V23H23V12Z" fill="#FFB900" />
              </svg>
              Continue with Microsoft Entra ID
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4" style={{ marginBottom: '18px' }}>
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest">or sign in with email</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: '10px' }}>
              <label htmlFor="login-email" className="block text-[13px] font-semibold text-[var(--text-primary)]" style={{ marginBottom: '6px' }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@meridian.app"
                autoComplete="email"
                className="input !text-[14px] w-full"
                style={{ height: '44px' }}
                required
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '18px' }}>
              <label htmlFor="login-password" className="block text-[13px] font-semibold text-[var(--text-primary)]" style={{ marginBottom: '6px' }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input !text-[14px] w-full"
                  style={{ height: '44px', paddingRight: '44px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  style={{ height: '44px', width: '44px' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg width="16" height="16" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {showPassword ? (
                      <path d="M7.5 11C4.8 11 2.5 9 1 7.5C2.5 6 4.8 4 7.5 4C10.2 4 12.5 6 14 7.5C12.5 9 10.2 11 7.5 11Z" stroke="currentColor" strokeWidth="1.5"/>
                    ) : (
                      <>
                        <path d="M7.5 11C4.8 11 2.5 9 1 7.5C2.5 6 4.8 4 7.5 4C10.2 4 12.5 6 14 7.5C12.5 9 10.2 11 7.5 11Z" stroke="currentColor" strokeWidth="1.5"/>
                        <line x1="2" y1="2" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ marginBottom: '20px' }}>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full text-[15px] shadow-sm"
                style={{ height: '44px' }}
              >
                {isLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Explicit Divider for Demo Accounts */}
          <div className="w-full h-px bg-[var(--border)]" style={{ marginBottom: '18px' }} />

          {/* Demo accounts */}
          <div>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider" style={{ marginBottom: '10px' }}>Demo accounts</p>
            <div className="flex flex-col" style={{ gap: '6px' }}>
              {roleAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => quickLogin(account.email)}
                  className="w-full flex items-center rounded-[var(--radius-md)] bg-[var(--bg-canvas)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-wash)] transition-all group"
                  style={{ padding: '6px', gap: '8px' }}
                >
                  <span 
                    className="rounded-[var(--radius-sm)] bg-white text-[12px] font-bold flex items-center justify-center text-[var(--text-secondary)] flex-shrink-0 shadow-sm border border-[var(--border)]"
                    style={{ width: '36px', height: '36px' }}
                  >
                    {account.avatarInitials}
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="text-[13px] font-semibold block text-[var(--text-primary)]">{account.name}</span>
                    <span className="text-[11px] text-[var(--text-secondary)] block">{account.email}</span>
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider group-hover:text-[var(--brand)] transition-colors">
                    {account.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] text-center" style={{ marginTop: '16px' }}>
              Password for all demo accounts: <code className="font-mono bg-[var(--bg-muted)] px-1.5 py-0.5 rounded text-[var(--text-secondary)] font-semibold">{DEMO_PASSWORD}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
