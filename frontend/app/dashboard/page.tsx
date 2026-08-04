'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatCompactNumber, formatPercentage } from '@/lib/format';
import {
  TrendingUp,
  Users,
  FileText,
  Globe,
  ThumbsUp,
  MessageCircle,
  Share2,
  Eye
} from 'lucide-react';
import { TrendChart } from '@/components/charts/trend-chart';
import { CustomPieChart } from '@/components/charts/pie-chart';
import { ExportButton } from '@/components/export-button';
import { ExportService } from '@/lib/export/export-service';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { AutoRefreshToggle } from '@/components/auto-refresh-toggle';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const STAT_ICON_COLORS = {
  blue: 'bg-primary/10 text-primary',
  purple: 'bg-purple-500/10 text-purple-500',
  green: 'bg-emerald-500/10 text-emerald-500',
  orange: 'bg-orange-500/10 text-orange-500',
} as const;

export default function DashboardPage() {
  // Auto-refresh hook
  const autoRefresh = useAutoRefresh({
    interval: 30,
    enabled: false,
    queryKeys: ['dashboard-overview', 'platforms', 'trends'],
  });

  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => apiClient.getDashboardOverview(),
  });

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiClient.getPlatforms(),
  });

  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: () => apiClient.getTrends(),
  });

  const { data: postStats } = useQuery({
    queryKey: ['posts-stats'],
    queryFn: () => apiClient.getPostsStats(),
  });

  const handleExport = () => {
    if (overview) {
      ExportService.exportDashboard(overview);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Posts',
      value: formatCompactNumber(overview?.totalPosts || 0),
      icon: FileText,
      colorKey: 'blue' as const,
      detail: formatNumber(overview?.totalPosts || 0),
    },
    {
      name: 'Total Influencers',
      value: formatNumber(overview?.totalInfluencers || 0),
      icon: Users,
      colorKey: 'purple' as const,
    },
    {
      name: 'Active Platforms',
      value: overview?.totalPlatforms || 0,
      icon: Globe,
      colorKey: 'green' as const,
    },
    {
      name: 'Avg Engagement',
      value: formatCompactNumber(overview?.avgEngagementScore || 0),
      icon: TrendingUp,
      colorKey: 'orange' as const,
      detail: overview?.avgEngagementScore?.toFixed(2) || '0',
    },
  ];

  const sentimentData = overview?.sentimentDistribution;

  // Prepare sentiment pie data
  const sentimentPieData = [
    { name: 'Positive', value: sentimentData?.positive || 0 },
    { name: 'Neutral', value: sentimentData?.neutral || 0 },
    { name: 'Negative', value: sentimentData?.negative || 0 },
  ];

  const sentimentTotal =
    (sentimentData?.positive || 0) +
    (sentimentData?.neutral || 0) +
    (sentimentData?.negative || 0);

  // Format trend data for charts
  const dailyTrendData = trends?.dailyPosts?.slice(-7).map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count,
    engagement: item.engagement,
  })) || [];

  const sentimentTiles = [
    {
      label: 'Positive',
      value: sentimentData?.positive || 0,
      pct: formatPercentage(sentimentTotal ? (sentimentData?.positive || 0) / sentimentTotal : 0),
      bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      labelText: 'text-emerald-800 dark:text-emerald-300',
    },
    {
      label: 'Neutral',
      value: sentimentData?.neutral || 0,
      pct: formatPercentage(sentimentTotal ? (sentimentData?.neutral || 0) / sentimentTotal : 0),
      bg: 'bg-muted border-border',
      text: 'text-muted-foreground',
      labelText: 'text-card-foreground',
    },
    {
      label: 'Negative',
      value: sentimentData?.negative || 0,
      pct: formatPercentage(sentimentTotal ? (sentimentData?.negative || 0) / sentimentTotal : 0),
      bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      labelText: 'text-red-800 dark:text-red-300',
    },
  ];

  const activityTiles = [
    { label: 'Last 24 Hours', value: formatNumber(overview?.recentActivity?.last24Hours || 0), bg: 'bg-primary/10 text-primary' },
    { label: 'Last 7 Days', value: formatNumber(overview?.recentActivity?.last7Days || 0), bg: 'bg-purple-500/10 text-purple-500' },
    { label: 'Last 30 Days', value: formatNumber(overview?.recentActivity?.last30Days || 0), bg: 'bg-emerald-500/10 text-emerald-500' },
  ];

  const engagementTiles = [
    { label: 'Likes', value: formatCompactNumber(postStats?.totalLikes || 0), icon: ThumbsUp, bg: 'bg-primary/10 text-primary' },
    { label: 'Comments', value: formatCompactNumber(postStats?.totalComments || 0), icon: MessageCircle, bg: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Shares', value: formatCompactNumber(postStats?.totalShares || 0), icon: Share2, bg: 'bg-purple-500/10 text-purple-500' },
    { label: 'Views', value: formatCompactNumber(postStats?.totalViews || 0), icon: Eye, bg: 'bg-orange-500/10 text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        description="Social media analytics for Festival Mbois"
      >
        <AutoRefreshToggle
          isEnabled={autoRefresh.isEnabled}
          countdown={autoRefresh.countdown}
          onToggle={autoRefresh.toggle}
          interval={30}
        />
        <ExportButton
          onExport={handleExport}
          label="Export Dashboard"
          disabled={!overview}
        />
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} className="p-6 hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <p className="mt-2 text-3xl font-bold text-card-foreground" title={stat.detail}>
                    {stat.value}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${STAT_ICON_COLORS[stat.colorKey]}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <TrendChart
            data={dailyTrendData}
            title="Posts Trend (Last 7 Days)"
          />
        </Card>

        <Card className="p-6">
          <CustomPieChart
            data={sentimentPieData}
            title="Sentiment Distribution"
            colors={['#10b981', '#64748b', '#ef4444']}
          />
        </Card>
      </div>

      {/* Sentiment Distribution */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">
          Sentiment Breakdown
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {sentimentTiles.map((tile) => (
            <div key={tile.label} className={`rounded-xl border p-4 ${tile.bg}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${tile.labelText}`}>{tile.label}</span>
                <span className={`text-2xl font-bold ${tile.text}`}>
                  {tile.value}
                </span>
              </div>
              <p className={`mt-2 text-xs ${tile.text}`}>
                {tile.pct}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">
            Recent Activity
          </h2>
          <div className="space-y-4">
            {activityTiles.map((activity) => (
              <div key={activity.label} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{activity.label}</p>
                  <p className={`text-2xl font-bold ${activity.bg}`}>
                    {activity.value}
                  </p>
                </div>
                <FileText className={`h-8 w-8 ${activity.bg}`} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">
            Platform Stats
          </h2>
          <div className="space-y-3">
            <div className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 p-4 text-white shadow-card-hover">
              <p className="text-sm font-medium opacity-90">Top Platform</p>
              <p className="mt-1 text-2xl font-bold">
                {overview?.topPlatform?.name || 'N/A'}
              </p>
              <p className="mt-1 text-sm opacity-90">
                {formatNumber(overview?.topPlatform?.postsCount || 0)} posts
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3">
                <ThumbsUp className="mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total Engagement</p>
                <p className="text-lg font-bold text-card-foreground">
                  {formatCompactNumber(overview?.totalEngagement || 0)}
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-3">
                <Globe className="mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Platforms</p>
                <p className="text-lg font-bold text-card-foreground">
                  {platforms?.length || 0} Active
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">
          Engagement Overview
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {engagementTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div key={tile.label} className="rounded-xl bg-muted/40 p-4 text-center transition-colors duration-200 hover:bg-muted/70">
                <Icon className={`mx-auto mb-2 h-6 w-6 ${tile.bg}`} />
                <p className="text-sm text-muted-foreground">{tile.label}</p>
                <p className="text-xl font-bold text-card-foreground">
                  {tile.value}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}