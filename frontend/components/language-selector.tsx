'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LanguageCode = 'en' | 'id' | 'ar';

export const LANGUAGES: Array<{ code: LanguageCode; label: string; native: string }> = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'id', label: 'Indonesia', native: 'Bahasa Indonesia' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
];

export const LANGUAGE_STORAGE_KEY = 'language';

interface LanguageSelectorProps {
  className?: string;
  showLabel?: boolean;
  align?: 'left' | 'right';
  direction?: 'down' | 'up';
}

export function LanguageSelector({
  className,
  showLabel = false,
  align = 'right',
  direction = 'down',
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    if (saved && LANGUAGES.some((l) => l.code === saved)) {
      setLanguage(saved);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const select = (code: LanguageCode) => {
    setLanguage(code);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    setOpen(false);
  };

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.label}`}
        className={cn(
          'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium text-card-foreground transition-all duration-200',
          'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        )}
      >
        {showLabel && <span className="text-sm font-medium text-card-foreground">Language</span>}
        <Globe className="text-blue-500" style={{ width: 18, height: 18 }} />
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
          {mounted ? current.native : 'English'}
        </span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Select language"
            initial={{ opacity: 0, y: direction === 'up' ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === 'up' ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute z-50 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-popover',
              direction === 'up' ? 'bottom-full mb-2' : 'mt-2',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {LANGUAGES.map((lang) => (
              <li key={lang.code} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={language === lang.code}
                  onClick={() => select(lang.code)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    language === lang.code
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-popover-foreground hover:bg-accent'
                  )}
                >
                  <span>
                    <span className="block">{lang.label}</span>
                    <span className="block text-xs text-muted-foreground">{lang.native}</span>
                  </span>
                  {language === lang.code && <Check className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
