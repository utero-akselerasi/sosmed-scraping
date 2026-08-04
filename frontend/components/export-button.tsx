'use client';

import { Download, FileSpreadsheet, FileJson, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, type ButtonVariant } from '@/components/ui/button';

interface ExportButtonProps {
  onExport: () => void;
  label?: string;
  variant?: ButtonVariant;
  icon?: boolean;
  disabled?: boolean;
}

export function ExportButton({
  onExport,
  label = 'Export',
  variant = 'outline',
  icon = true,
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting}
      variant={variant}
      loading={isExporting}
    >
      {icon && <Download className="h-4 w-4" />}
      {isExporting ? 'Exporting...' : label}
    </Button>
  );
}

interface ExportDropdownProps {
  onExportCSV: () => void;
  onExportJSON?: () => void;
  disabled?: boolean;
}

export function ExportDropdown({ onExportCSV, onExportJSON, disabled = false }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleExport = async (exportFn: () => void) => {
    setIsExporting(true);
    setIsOpen(false);
    try {
      await exportFn();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        variant="outline"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        loading={isExporting}
      >
        <Download className="h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export'}
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && !isExporting && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-popover">
          <button
            onClick={() => handleExport(onExportCSV)}
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-popover-foreground transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" />
            Export as CSV
          </button>
          {onExportJSON && (
            <button
              onClick={() => handleExport(onExportJSON)}
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-popover-foreground transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileJson className="mr-2 h-4 w-4 text-primary" />
              Export as JSON
            </button>
          )}
        </div>
      )}
    </div>
  );
}