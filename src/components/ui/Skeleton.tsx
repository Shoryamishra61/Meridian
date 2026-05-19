/**
 * Meridian — Skeleton Loading Components
 * Shimmer-based skeleton screens for smooth perceived loading.
 */

'use client';

import React from 'react';

const shimmerKeyframes = `
@keyframes meridian-shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`;

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
  backgroundSize: '800px 100%',
  animation: 'meridian-shimmer 1.5s ease-in-out infinite',
  borderRadius: '6px',
};

function ShimmerBlock({ width = '100%', height = '16px', style }: { width?: string; height?: string; style?: React.CSSProperties }) {
  return <div style={{ ...shimmerStyle, width, height, ...style }} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: '16px', padding: '14px 20px', borderBottom: '2px solid var(--border)', background: 'var(--bg-canvas)' }}>
          {Array.from({ length: cols }).map((_, i) => (
            <ShimmerBlock key={i} width={i === 0 ? '30%' : '20%'} height="12px" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{ display: 'flex', gap: '16px', padding: '16px 20px', borderBottom: r < rows - 1 ? '1px solid #f1f5f9' : 'none' }}>
            {Array.from({ length: cols }).map((_, c) => (
              <ShimmerBlock key={c} width={c === 0 ? '30%' : '20%'} height="14px" />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '16px' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
            <ShimmerBlock width="60%" height="10px" style={{ marginBottom: '14px' }} />
            <ShimmerBlock width="40%" height="28px" style={{ marginBottom: '8px' }} />
            <ShimmerBlock width="80%" height="10px" />
          </div>
        ))}
      </div>
    </>
  );
}

export function PageSkeleton() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Title */}
        <div>
          <ShimmerBlock width="200px" height="24px" style={{ marginBottom: '8px' }} />
          <ShimmerBlock width="320px" height="14px" />
        </div>
        {/* Stat cards */}
        <CardSkeleton />
        {/* Table */}
        <TableSkeleton />
      </div>
    </>
  );
}

export function GoalCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <ShimmerBlock width="50%" height="16px" />
              <ShimmerBlock width="60px" height="24px" />
            </div>
            <ShimmerBlock width="70%" height="12px" style={{ marginBottom: '8px' }} />
            <ShimmerBlock width="40%" height="12px" />
          </div>
        ))}
      </div>
    </>
  );
}
