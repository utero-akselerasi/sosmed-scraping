'use client';

import { ReactNode } from 'react';

interface ResponsiveTableProps {
  headers: string[];
  children: ReactNode;
  mobileCard?: boolean;
}

export function ResponsiveTable({ headers, children, mobileCard = true }: ResponsiveTableProps) {
  if (mobileCard) {
    return (
      <>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/60">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {children}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {children}
        </div>
      </>
    );
  }

  // Standard table with horizontal scroll on mobile
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/60">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {children}
        </tbody>
      </table>
    </div>
  );
}

interface MobileCardProps {
  children: ReactNode;
  onClick?: () => void;
}

export function MobileCard({ children, onClick }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className="md:hidden rounded-lg border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer"
    >
      {children}
    </div>
  );
}

interface MobileCardRowProps {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
}

export function MobileCardRow({ label, value, fullWidth = false }: MobileCardRowProps) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="text-sm font-medium text-card-foreground">{value}</div>
    </div>
  );
}