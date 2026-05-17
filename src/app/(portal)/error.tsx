'use client';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <section className="surface max-w-lg p-6">
        <p className="label-sm mb-2">Recovery state</p>
        <h1 className="mb-2 text-[20px]">This workspace hit a recoverable error</h1>
        <p className="mb-4 text-[13px] leading-6 text-[var(--text-secondary)]">
          The portal kept the session active. Try reloading this view; if it repeats, use the role switcher to continue another workflow.
        </p>
        <pre className="mb-4 max-h-28 overflow-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-[11px] text-[var(--text-tertiary)]">
          {error.message}
        </pre>
        <button
          onClick={reset}
          className="btn-press min-h-11 rounded-[var(--radius-md)] bg-[var(--brand)] px-4 text-[13px] font-medium text-[var(--text-inverse)] hover:bg-[var(--brand-hover)]"
        >
          Retry view
        </button>
      </section>
    </main>
  );
}
