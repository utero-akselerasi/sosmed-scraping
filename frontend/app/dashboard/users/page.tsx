'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { formatNumber, formatLocaleDate } from '@/lib/format';
import { Users, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

const ROLE_BADGES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-300',
  analyst: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300',
  viewer: 'bg-muted text-muted-foreground',
};

export default function UsersPage() {
  const { t } = useI18n();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.getUsers({ limit: 50 }),
  });

  const stats = [
    { label: t('users.total'), value: usersData?.meta?.total || 0, icon: Users, color: 'text-primary' },
    { label: t('users.active'), value: usersData?.data?.filter((u: any) => u.isActive).length || 0, icon: ShieldCheck, color: 'text-emerald-500' },
    { label: t('users.admins'), value: usersData?.data?.filter((u: any) => u.role === 'admin').length || 0, icon: ShieldCheck, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.management')}
        description={t('users.description')}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={cn('text-2xl font-bold text-card-foreground', stat.color)}>
                    {stat.value}
                  </p>
                </div>
                <Icon className={cn('h-6 w-6', stat.color)} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">{t('users.loading')}</p>
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('users.lastLogin')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {usersData?.data?.map((user: any) => (
                  <tr key={user.id} className="transition-colors duration-150 hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{user.fullName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn('rounded px-2 py-1 text-xs font-medium', ROLE_BADGES[user.role] ?? ROLE_BADGES.viewer)}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isActive ? (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {t('common.active')}
                        </span>
                      ) : (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-500/10 dark:text-red-300">
                          {t('common.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {user.lastLogin ? formatLocaleDate(user.lastLogin, { year: 'numeric', month: 'short', day: 'numeric' }) : t('common.never')}
                    </td>
                  </tr>
                ))}
                {(!usersData?.data || usersData.data.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      {t('users.noUsers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}