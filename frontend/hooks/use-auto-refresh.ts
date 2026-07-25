// Auto-refresh hook
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseAutoRefreshOptions {
  interval?: number; // in seconds
  enabled?: boolean;
  queryKeys?: string[];
}

export function useAutoRefresh({
  interval = 30,
  enabled = false,
  queryKeys = [],
}: UseAutoRefreshOptions = {}) {
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [countdown, setCountdown] = useState(interval);

  useEffect(() => {
    if (!isEnabled) {
      setCountdown(interval);
      return;
    }

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Refresh queries
          if (queryKeys.length > 0) {
            queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: [key] });
            });
          } else {
            queryClient.invalidateQueries();
          }
          return interval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isEnabled, interval, queryKeys, queryClient]);

  const toggle = () => setIsEnabled(!isEnabled);
  const reset = () => setCountdown(interval);

  return {
    isEnabled,
    countdown,
    toggle,
    reset,
  };
}
