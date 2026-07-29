// Auto-refresh Toggle Component
'use client';

import { RefreshCw } from 'lucide-react';
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
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggle}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          isEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
      
      <div className="flex items-center gap-2">
        <RefreshCw
          className={cn(
            'w-4 h-4',
            isEnabled ? 'text-blue-500 animate-spin' : 'text-gray-400'
          )}
          style={{ animationDuration: '3s' }}
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Auto-refresh
        </span>
        {isEnabled && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({countdown}s)
          </span>
        )}
      </div>
    </div>
  );
}
