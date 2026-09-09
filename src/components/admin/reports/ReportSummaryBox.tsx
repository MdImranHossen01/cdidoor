"use client";

import React from 'react';
import { DollarSign, TrendingUp, Receipt, Landmark, FileText } from 'lucide-react';

export interface SummaryRow {
  label: string;
  value: number | string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}

export interface SummarySection {
  title: string;
  icon?: 'sales' | 'collection' | 'expense' | 'profit' | 'account' | 'other';
  rows: SummaryRow[];
  note?: string;
}

const icons = {
  sales:      <DollarSign className="h-4 w-4 text-primary" />,
  collection: <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  expense:    <Receipt className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
  profit:     <TrendingUp className="h-4 w-4 text-primary" />,
  account:    <Landmark className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  other:      <FileText className="h-4 w-4 text-primary" />,
};

const variantClass: Record<string, string> = {
  default: 'font-semibold text-foreground',
  success: 'font-bold text-emerald-600 dark:text-emerald-400',
  danger:  'font-bold text-rose-600 dark:text-rose-400',
  warning: 'font-bold text-amber-600 dark:text-amber-400',
};

const formatTK = (v: number | string) =>
  typeof v === 'number' ? `TK. ${v.toLocaleString('en-BD', { minimumFractionDigits: 2 })}` : String(v);

interface ReportSummaryBoxProps {
  sections: SummarySection[];
}

export const ReportSummaryBox: React.FC<ReportSummaryBoxProps> = ({ sections }) => (
  <div className="space-y-4">
    {sections.map((sec, si) => (
      <div key={si} className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        {/* Section header */}
        <div className="px-3.5 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
          {sec.icon ? icons[sec.icon] : icons.other}
          <h3 className="text-sm sm:text-base font-bold text-foreground">{sec.title}</h3>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/50">
          {sec.rows.map((row, ri) => (
            <div key={ri} className={`px-3.5 py-2.5 flex items-center justify-between text-sm gap-2 ${ri % 2 === 1 ? 'bg-muted/10' : ''}`}>
              <span className="font-semibold text-foreground/90">{row.label}</span>
              <span className={variantClass[row.variant ?? 'default']}>
                : {formatTK(row.value)}
              </span>
            </div>
          ))}
        </div>

        {sec.note && (
          <div className="px-3.5 py-1.5 bg-muted/20 border-t border-border text-[11px] text-muted-foreground italic">
            {sec.note}
          </div>
        )}
      </div>
    ))}
  </div>
);
