'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/lib/i18n';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Globe,
  Hash,
  UserCircle,
  BarChart3,
  LogOut,
  Menu,
  X,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const NAV_SECTIONS: Array<{
  key: string;
  items: Array<{
    nameKey: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: string[];
  }>;
}> = [
  {
    key: 'overview',
    items: [
      { nameKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'analyst', 'viewer'] },
      { nameKey: 'posts', href: '/dashboard/posts', icon: FileText, roles: ['admin', 'analyst', 'viewer'] },
      { nameKey: 'influencers', href: '/dashboard/influencers', icon: Users, roles: ['admin', 'analyst', 'viewer'] },
      { nameKey: 'platforms', href: '/dashboard/platforms', icon: Globe, roles: ['admin', 'analyst', 'viewer'] },
      { nameKey: 'analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['admin', 'analyst', 'viewer'] },
    ],
  },
  {
    key: 'management',
    items: [
      { nameKey: 'keywords', href: '/dashboard/keywords', icon: Hash, roles: ['admin'] },
      { nameKey: 'users', href: '/dashboard/users', icon: UserCircle, roles: ['admin'] },
      { nameKey: 'admin', href: '/dashboard/admin', icon: Settings, roles: ['admin'] },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const role = user?.role || 'viewer';
  const roleLabel = t(`sidebar.role${role.charAt(0).toUpperCase()}${role.slice(1)}`);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const renderNav = () => (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label={t('sidebar.navigation')}>
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((item) => item.roles.includes(role));
        if (items.length === 0) return null;

        return (
          <div key={section.key}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {t(`sidebar.${section.key}`)}
            </p>
            <ul className="space-y-1">
              {items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.nameKey}>
                    <Link
                      href={item.href}
                      onClick={closeMobileMenu}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive
                          ? 'bg-sidebar-active text-sidebar-active-foreground'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-sidebar-foreground hover:translate-x-0.5'
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-indicator"
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                          aria-hidden="true"
                        />
                      )}
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-transform duration-200',
                          isActive
                            ? 'text-primary'
                            : 'text-sidebar-muted group-hover:text-sidebar-foreground group-hover:scale-105'
                        )}
                      />
                      <span>{t(`sidebar.${item.nameKey}`)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const renderUserCard = () => (
    <div className="border-b border-sidebar-border px-4 pb-4 pt-2">
      <div className="group flex items-center gap-3 rounded-xl border border-sidebar-border bg-card/60 p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-blue-500 text-white shadow-sm">
          <span className="text-base font-bold">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {user?.fullName || t('sidebar.userFallback')}
          </p>
          <p className="flex items-center gap-1 text-xs capitalize text-sidebar-muted">
            <ShieldCheck className="h-3 w-3 text-primary" />
            {roleLabel}
          </p>
        </div>
      </div>
    </div>
  );

  const renderLogo = () => (
    <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-500 shadow-sm shadow-blue-500/30">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight text-sidebar-foreground">{t('brand.name')}</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-sidebar-muted">
            {t('brand.tagline')}
          </p>
        </div>
      </div>
      <button
        onClick={closeMobileMenu}
        aria-label={t('sidebar.closeMenu')}
        className="rounded-md p-1 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );

  const renderFooter = () => (
    <div className="border-t border-sidebar-border px-3 py-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between rounded-lg px-1.5 py-0.5">
          <ThemeToggle showLabel />
        </div>
        <div className="flex items-center justify-between rounded-lg px-1.5 py-0.5">
          <LanguageSelector showLabel direction="up" />
        </div>
      </div>
      <div className="mt-3 border-t border-sidebar-border pt-3">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-all duration-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-[18px] w-[18px] transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>{t('sidebar.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen((o) => !o)}
        aria-label={isMobileMenuOpen ? t('sidebar.closeMenu') : t('sidebar.openMenu')}
        aria-expanded={isMobileMenuOpen}
        className="fixed left-4 top-4 z-50 rounded-lg border border-border bg-card p-2 text-card-foreground shadow-card transition-colors hover:bg-accent lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-popover lg:static lg:z-auto lg:shadow-none',
          'transform transition-transform duration-300 ease-in-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {renderLogo()}
        {renderUserCard()}
        {renderNav()}
        {renderFooter()}
      </div>
    </>
  );
}