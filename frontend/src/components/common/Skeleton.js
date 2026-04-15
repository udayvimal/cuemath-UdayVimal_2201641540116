import React from 'react';

/** Skeleton loading placeholder — animated shimmer effect */
export function Skeleton({ width, height, borderRadius = '8px', className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

/** Skeleton for a deck card on the home screen */
export function DeckCardSkeleton() {
  return (
    <div className="deck-card skeleton-card">
      <Skeleton width="60%" height="24px" className="mb-2" />
      <Skeleton width="40%" height="16px" className="mb-4" />
      <div style={{ display: 'flex', gap: '12px' }}>
        <Skeleton width="60px" height="48px" borderRadius="8px" />
        <Skeleton width="60px" height="48px" borderRadius="8px" />
        <Skeleton width="60px" height="48px" borderRadius="8px" />
      </div>
      <Skeleton width="100%" height="6px" borderRadius="3px" className="mt-3" />
    </div>
  );
}

/** Skeleton for stat cards on dashboard */
export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton width="40px" height="40px" borderRadius="50%" className="mb-3" />
      <Skeleton width="80px" height="40px" className="mb-1" />
      <Skeleton width="100px" height="16px" />
    </div>
  );
}
