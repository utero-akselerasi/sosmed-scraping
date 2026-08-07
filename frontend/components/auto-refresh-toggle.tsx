// Auto-refresh Toggle Component
'use client';

import { RefreshCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface AutoRefreshToggleProps {
  isEnabled: boolean;
  countdown: number;
  onToggle: () => void;
  interval?: number;
}

export function AutoRefreshToggle({
  isEnabled,
  countdown,
  onToggle,
  interval = 30,
}: AutoRefreshToggleProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 shadow-card">
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={isEnabled}
        aria-label={t('common.toggleAutoRefresh')}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>

      <div className="flex items-center gap-2">
        <RefreshCw
          className={cn('h-4 w-4 transition-colors duration-200', isEnabled ? 'text-primary' : 'text-muted-foreground')}
        />
        <span className="text-sm font-medium text-card-foreground">
          {t('common.autoRefresh')}
        </span>
        {isEnabled && (
          <span className="text-xs tabular-nums text-muted-foreground">
            ({countdown}s)
          </span>
        )}
      </div>
    </div>
  );
}