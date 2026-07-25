'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';

interface ExportButtonProps {
  onExport: () => void;
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: boolean;
  disabled?: boolean;
}

export function ExportButton({ 
  onExport, 
  label = 'Export', 
  variant = 'outline',
  icon = true,
  disabled = false 
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

  const baseClasses = "inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100",
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {icon && (
        <Download className={`w-4 h-4 ${label ? 'mr-2' : ''} ${isExporting ? 'animate-bounce' : ''}`} />
      )}
      {isExporting ? 'Exporting...' : label}
    </button>
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
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className="inline-flex items-center px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 active:bg-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className={`w-4 h-4 mr-2 ${isExporting ? 'animate-bounce' : ''}`} />
        {isExporting ? 'Exporting...' : 'Export'}
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !isExporting && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5">
            <div className="py-1">
              <button
                onClick={() => handleExport(onExportCSV)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <span className="mr-2">📊</span>
                Export as CSV
              </button>
              {onExportJSON && (
                <button
                  onClick={() => handleExport(onExportJSON)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <span className="mr-2">📄</span>
                  Export as JSON
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
