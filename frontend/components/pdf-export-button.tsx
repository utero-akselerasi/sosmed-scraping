'use client';

import { FileDown } from 'lucide-react';
import { useState } from 'react';
import { Button, type ButtonVariant } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

interface PDFExportButtonProps {
  onExport: () => Promise<void>;
  label?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export function PDFExportButton({
  onExport,
  label,
  variant = 'outline',
  disabled = false,
}: PDFExportButtonProps) {
  const { t } = useI18n();
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

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting}
      variant={variant}
      loading={isExporting}
    >
      <FileDown className="h-4 w-4" />
      {isExporting ? t('common.generating') : (label ?? t('common.exportPdf'))}
    </Button>
  );
}