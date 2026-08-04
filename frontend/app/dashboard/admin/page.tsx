'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Activity,
  Database,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
} from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

export default function AdminPage() {
  const { data: overview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => apiClient.getDashboardOverview(),
  });

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiClient.getPlatforms(),
  });

  const dbStats = [
    { label: 'Total Posts', value: formatNumber(overview?.totalPosts || 0), bg: 'bg-primary/10 text-primary' },
    { label: 'Total Influencers', value: formatNumber(overview?.totalInfluencers || 0), bg: 'bg-purple-500/10 text-purple-500' },
    { label: 'Active Platforms', value: formatNumber(platforms?.filter((platform: any) => platform.isActive).length || 0), bg: 'bg-emerald-500/10 text-emerald-500' },
  ];

  const gradientStats = [
    { icon: FileText, label: 'Total Posts', value: formatNumber(overview?.totalPosts || 0), gradient: 'from-blue-500 to-blue-600' },
    { icon: Users, label: 'Total Influencers', value: formatNumber(overview?.totalInfluencers || 0), gradient: 'from-purple-500 to-purple-600' },
    { icon: TrendingUp, label: 'Avg Engagement', value: overview?.avgEngagementScore?.toFixed(1) || '0', gradient: 'from-emerald-500 to-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="System monitoring and health status"
      />

      {/* System Monitoring */}
      <Card className="p-6">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-card-foreground">
          <Activity className="mr-2 h-5 w-5 text-orange-500" />
          System Monitoring
        </h2>
        <p className="text-sm text-muted-foreground">
          No monitoring data available. System metrics, uptime, and resource usage
          will appear here once the monitoring API is available.
        </p>
      </Card>

      {/* Database Status */}
      <Card className="p-6">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-card-foreground">
          <Database className="mr-2 h-5 w-5 text-emerald-500" />
          Database Status
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {dbStats.map((stat) => (
            <div key={stat.label} className={`rounded-xl p-4 ${stat.bg}`}>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-card-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Worker Status */}
      <Card className="p-6">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-card-foreground">
          <Server className="mr-2 h-5 w-5 text-primary" />
          Worker Status
        </h2>
        <p className="text-sm text-muted-foreground">
          No worker status available yet. Worker activity will appear here once
          workers start reporting their status.
        </p>
      </Card>

      {/* Platform Status */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">
          Platform Status
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {platforms?.map((platform: any) => (
            <div key={platform.id} className="rounded-xl border border-border bg-card/60 p-4 transition-all duration-200 hover:shadow-card-hover">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-card-foreground">{platform.name}</p>
                {platform.isActive ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">Status: {platform.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {gradientStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-xl bg-gradient-to-br ${stat.gradient} p-6 text-white shadow-card`}>
              <Icon className="mb-2 h-8 w-8 opacity-80" />
              <p className="text-sm opacity-90">{stat.label}</p>
              <p className="mt-1 text-3xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* System Information */}
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-500/20 dark:bg-yellow-500/10">
        <div className="flex items-start">
          <AlertTriangle className="mr-3 mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <div>
            <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-200">System Information</h3>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300/80">
              Content appears here as workers collect real data. All content tables
              start empty after a fresh setup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}