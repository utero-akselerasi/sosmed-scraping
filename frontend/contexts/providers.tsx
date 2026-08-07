'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './auth-context';
import { ThemeProvider, useTheme } from './theme-context';
import { ToastProvider } from '@/components/ui/toast';
import { I18nProvider } from '@/lib/i18n';
import { useState } from 'react';

function ThemedToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: theme === 'dark' ? '#1e293b' : '#ffffff',
          color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow:
            theme === 'dark'
              ? '0 10px 30px -5px rgb(0 0 0 / 0.5)'
              : '0 10px 30px -5px rgb(15 23 42 / 0.15)',
          fontSize: '14px',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
              <ThemedToaster />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
