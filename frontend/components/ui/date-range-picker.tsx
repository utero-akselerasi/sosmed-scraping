'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (startDate: string | null, endDate: string | null) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate || '');
  const [tempEndDate, setTempEndDate] = useState(endDate || '');
  const containerRef = useRef<HTMLDivElement>(null);

  const presets = [
    { label: 'Today', days: 0 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();

    if (days === 0) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(start.getDate() - days);
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    setTempStartDate(startStr);
    setTempEndDate(endStr);
    onChange(startStr, endStr);
    setIsOpen(false);
  };

  const applyCustomRange = () => {
    if (tempStartDate && tempEndDate) {
      onChange(tempStartDate, tempEndDate);
      setIsOpen(false);
    }
  };

  const clearDates = () => {
    setTempStartDate('');
    setTempEndDate('');
    onChange(null, null);
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) return 'Select Date Range';

    const start = new Date(startDate);
    const end = new Date(endDate);

    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const maxDate = new Date().toISOString().split('T')[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-card-foreground shadow-card transition-all duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Calendar className="h-4 w-4 text-primary" />
        {formatDateRange()}
        {(startDate || endDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearDates();
            }}
            aria-label="Clear date range"
            className="ml-1 rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 w-80 rounded-xl border border-border bg-popover p-4 shadow-popover">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-popover-foreground">Date Range</h3>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-popover-foreground">Quick Select</p>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset.days)}
                  className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Range */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-popover-foreground">Custom Range</p>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Start Date
              </label>
              <input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                max={tempEndDate || maxDate}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-card-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                End Date
              </label>
              <input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                min={tempStartDate}
                max={maxDate}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-card-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={applyCustomRange}
                disabled={!tempStartDate || !tempEndDate}
                className="flex-1"
                size="md"
              >
                Apply
              </Button>
              <Button
                onClick={clearDates}
                variant="outline"
                className="flex-1"
                size="md"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}