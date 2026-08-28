'use client';

import Sidebar from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/lib/i18n';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/dashboard', '/dashboard/posts', '/dashboard/influencers', '/dashboard/platforms', '/dashboard/analytics', '/dashboard/keywords', '/dashboard/users', '/dashboard/admin', '/dashboard/profile'],
  analyst: ['/dashboard', '/dashboard/posts', '/dashboard/influencers', '/dashboard/platforms', '/dashboard/analytics', '/dashboard/profile'],
  viewer: ['/dashboard', '/dashboard/posts', '/dashboard/influencers', '/dashboard/platforms', '/dashboard/analytics', '/dashboard/profile'],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!isLoading && user) {
      const allowedRoutes = ROLE_ROUTES[user.role] || ROLE_ROUTES.viewer;
      if (!allowedRoutes.includes(pathname)) {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">{t('layout.loadingPlatform')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <motion.div
          key={pathname}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="container mx-auto px-4 py-6 lg:px-8 lg:py-8 mt-16 lg:mt-0"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}