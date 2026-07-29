'use client';

import { FileDown } from 'lucide-react';
import { useState } from 'react';

interface PDFExportButtonProps {
  onExport: () => Promise<void>;
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

export function PDFExportButton({ 
  onExport, 
  label = 'Export PDF', 
  variant = 'outline',
  disabled = false 
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  const baseClasses = "inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800",
    outline: "border-2 border-red-600 text-red-600 hover:bg-red-50 active:bg-red-100",
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      <FileDown className={`w-4 h-4 mr-2 ${isExporting ? 'animate-bounce' : ''}`} />
      {isExporting ? 'Generating...' : label}
    </button>
  );
}
