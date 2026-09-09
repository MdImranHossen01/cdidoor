"use client";

import React from 'react';

export interface ReportCardRow {
  label: string;
  value: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'muted' | 'primary';
  sub?: string;
}

interface ReportCardProps {
  title?: string;
  badge?: { text: string; variant?: 'default' | 'success' | 'danger' };
  rows: ReportCardRow[];
  footer?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default:  'text-foreground font-semibold',
  success:  'text-emerald-600 dark:text-emerald-400 font-bold',
  danger:   'text-rose-600 dark:text-rose-400 font-bold',
  warning:  'text-amber-600 dark:text-amber-400 font-bold',
  muted:    'text-muted-foreground',
  primary:  'text-primary font-semibold',
};

const badgeStyles: Record<string, string> = {
  default: 'bg-primary/10 text-primary border border-primary/20',
  success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  danger:  'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
};

export const ReportCard: React.FC<ReportCardProps> = ({ title, badge, rows, footer, className = '' }) => (
  <div className={`bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs ${className}`}>
    {(title || badge) && (
      <div className="px-3.5 py-2 bg-muted/30 border-b border-border flex items-center justify-between gap-2">
        {title && <span className="text-sm font-bold text-foreground truncate">{title}</span>}
        {badge && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeStyles[badge.variant ?? 'default']}`}>
            {badge.text}
          </span>
        )}
      </div>
    )}

    <div className="divide-y divide-border/50">
      {rows.map((row, i) => (
        <div key={i} className={`px-3.5 py-2 flex items-start justify-between gap-3 text-sm ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
          <span className="text-muted-foreground font-medium shrink-0 leading-snug">{row.label}</span>
          <div className="text-right">
            <span className={`${variantStyles[row.variant ?? 'default']} leading-snug`}>{row.value}</span>
            {row.sub && <div className="text-[11px] text-muted-foreground">{row.sub}</div>}
          </div>
        </div>
      ))}
    </div>

    {footer && (
      <div className="px-3.5 py-2 bg-muted/20 border-t border-border text-xs">{footer}</div>
    )}
  </div>
);
