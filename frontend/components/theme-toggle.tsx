'use client';

import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('common.switchToLight') : t('common.switchToDark')}
      title={isDark ? t('common.switchToLight') : t('common.switchToDark')}      className={cn(
        'group inline-flex h-9 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium text-card-foreground transition-all duration-200',
        'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        showLabel && 'justify-between px-3',
        className
      )}
    >
      {showLabel && (
        <span className="text-sm font-medium text-card-foreground">
          {isDark ? t('common.light') : t('common.dark')}
        </span>
      )}
      <span className="relative flex h-5 w-5 items-center justify-center">
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          initial={{ opacity: 0, rotate: -60, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute"
        >
          {isDark ? (
            <Moon className="h-4.5 w-4.5 text-blue-400" style={{ width: 18, height: 18 }} />
          ) : (
            <Sun className="text-amber-500" style={{ width: 18, height: 18 }} />
          )}
        </motion.span>
      </span>
    </button>
  );
}
