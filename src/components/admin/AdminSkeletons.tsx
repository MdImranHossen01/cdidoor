import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for Admin Dashboard overview metrics, charts, and activity lists.
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Top Header & Refresh bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      {/* Segment Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>

      {/* 9/12 Metric Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card shadow-sm flex flex-col items-center justify-center space-y-3 min-h-[130px]"
          >
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Charts & Breakdown section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border/50 bg-card space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="p-5 rounded-2xl border border-border/50 bg-card space-y-4">
          <Skeleton className="h-6 w-36 rounded" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>

      {/* Recent Orders / Transactions list */}
      <div className="p-5 rounded-2xl border border-border/50 bg-card space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Generic high-fidelity Table Skeleton for admin management pages (Users, Orders, Suppliers, Bills, Chalans, etc.)
 */
export function AdminTableSkeleton({
  rowCount = 7,
  columnCount = 5,
  titleWidth = 'w-48',
  showStats = false,
}: {
  rowCount?: number;
  columnCount?: number;
  titleWidth?: string;
  showStats?: boolean;
}) {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className={`h-8 ${titleWidth} rounded-lg`} />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 w-full sm:w-36 rounded-xl" />
        </div>
      </div>

      {/* Optional Stat Badges / Summary Cards */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 bg-card space-y-2">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-6 w-24 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl border border-border/50 bg-card/60 flex flex-col md:flex-row items-center justify-between gap-3">
        <Skeleton className="h-10 w-full md:w-80 rounded-xl" />
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between gap-4 bg-muted/20">
          {Array.from({ length: columnCount }).map((_, i) => (
            <Skeleton key={i} className={`h-4 ${i === 0 ? 'w-24' : 'w-20'} rounded`} />
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border/40">
          {Array.from({ length: rowCount }).map((_, rIndex) => (
            <div key={rIndex} className="p-4 flex items-center justify-between gap-4">
              {Array.from({ length: columnCount }).map((_, cIndex) => (
                <div key={cIndex} className="flex-1">
                  {cIndex === 0 ? (
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28 rounded" />
                        <Skeleton className="h-3 w-16 rounded" />
                      </div>
                    </div>
                  ) : cIndex === columnCount - 1 ? (
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                  ) : (
                    <Skeleton className="h-4 w-20 rounded" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-36 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Card Grid pages (Products, Showrooms, Banners, Testimonials, Blogs, FAQs)
 */
export function AdminCardGridSkeleton({
  itemCount = 6,
  titleWidth = 'w-48',
  aspectRatio = 'aspect-video',
}: {
  itemCount?: number;
  titleWidth?: string;
  aspectRatio?: string;
}) {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className={`h-8 ${titleWidth} rounded-lg`} />
          <Skeleton className="h-4 w-60 rounded" />
        </div>
        <Skeleton className="h-10 w-full sm:w-36 rounded-xl" />
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl border border-border/50 bg-card/60 flex flex-col md:flex-row items-center justify-between gap-3">
        <Skeleton className="h-10 w-full md:w-80 rounded-xl" />
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col">
            <Skeleton className={`${aspectRatio} w-full`} />
            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
              <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for Ledger / Tally page
 */
export function AdminLedgerSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl border border-border/50 bg-card space-y-3">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-8 w-36 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Date & Account filter */}
      <div className="p-4 rounded-2xl border border-border/50 bg-card/60 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/50 flex justify-between bg-muted/20">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <div className="divide-y divide-border/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Task Management Kanban / Board page
 */
export function AdminTaskBoardSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 rounded-lg" />
          <Skeleton className="h-4 w-60 rounded" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, colIndex) => (
          <div key={colIndex} className="p-4 rounded-2xl border border-border/60 bg-card/60 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <div key={cardIndex} className="p-4 rounded-xl border border-border/40 bg-card space-y-3 shadow-xs">
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export function AdminFormSkeleton({ titleWidth = 'w-48' }: { titleWidth?: string }) {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className={`h-8 ${titleWidth} rounded-lg`} />
          <Skeleton className="h-4 w-60 rounded" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      {/* Form Body */}
      <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-36 w-full rounded-2xl border-2 border-dashed" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Settings & Marketing pages
 */
export function AdminSettingsSkeleton({ title = "Settings" }: { title?: string }) {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Tabs bar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 rounded-2xl border border-border/60 bg-card space-y-4">
            <div className="space-y-1.5 pb-2 border-b border-border/40">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-3.5 w-56 rounded" />
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for System Design page
 */
export function AdminSystemDesignSkeleton() {
  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded" />
        </div>
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>

      {/* Presets */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-44 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl border border-border/50" />
          ))}
        </div>
      </div>

      {/* Config Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl border border-border/60 bg-card space-y-3">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-3 w-44 rounded" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Skeleton className="h-10 w-12 rounded-lg" />
              <Skeleton className="h-10 flex-1 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
