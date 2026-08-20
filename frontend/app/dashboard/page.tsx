'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import toast from 'react-hot-toast';
import { formatNumber, formatCompactNumber, formatPercentage, formatDateTime, formatLocaleDate, getPlatformLabel } from '@/lib/format';
import {
  TrendingUp,
  Users,
  FileText,
  Globe,
  ThumbsUp,
  MessageCircle,
  Share2,
  Eye,
  RefreshCw,
  Loader2
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
  const queryClient = useQueryClient();
  const { t } = useI18n();

  // Auto-refresh hook
  const autoRefresh = useAutoRefresh({
    interval: 30,
    enabled: false,
    queryKeys: ['dashboard-overview', 'platforms', 'trends', 'scraping-status'],
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

  const { data: scrapingStatus, isLoading: isLoadingScraping } = useQuery({
    queryKey: ['scraping-status'],
    queryFn: () => apiClient.getScrapingStatus(),
    refetchInterval: 15000,
  });

  const scrapeMutation = useMutation({
    mutationFn: () => apiClient.triggerScraping(),
    onSuccess: (data) => {
      toast.success(data?.message || t('dashboard.scrapeStarted'));
      queryClient.invalidateQueries({ queryKey: ['scraping-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (error: any) => {
      if (error?.response?.status === 409) {
        toast.error(t('dashboard.scrapeBusy'));
      } else {
        toast.error(apiClient.getErrorMessage(error, t('dashboard.scrapeFailed')));
      }
    },
  });

  const threadsScrapeMutation = useMutation({
    mutationFn: () => apiClient.triggerThreadsScraping(),
    onSuccess: (data) => {
      toast.success(data?.message || t('dashboard.scrapeThreadsStarted'));
      queryClient.invalidateQueries({ queryKey: ['scraping-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: any) => {
      if (error?.response?.status === 409) {
        toast.error(t('dashboard.scrapeBusy'));
      } else if (error?.response?.status === 400) {
        toast.error(error?.response?.data?.message || t('dashboard.scrapeThreadsDisabled'));
      } else {
        toast.error(apiClient.getErrorMessage(error, t('dashboard.scrapeFailed')));
      }
    },
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
          <p className="mt-4 text-sm text-muted-foreground">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: t('dashboard.totalPosts'),
      value: formatCompactNumber(overview?.totalPosts || 0),
      icon: FileText,
      colorKey: 'blue' as const,
      detail: formatNumber(overview?.totalPosts || 0),
    },
    {
      name: t('dashboard.totalInfluencers'),
      value: formatNumber(overview?.totalInfluencers || 0),
      icon: Users,
      colorKey: 'purple' as const,
    },
    {
      name: t('dashboard.activePlatforms'),
      value: overview?.totalPlatforms || 0,
      icon: Globe,
      colorKey: 'green' as const,
    },
    {
      name: t('dashboard.avgEngagement'),
      value: formatCompactNumber(overview?.avgEngagementScore || 0),
      icon: TrendingUp,
      colorKey: 'orange' as const,
      detail: overview?.avgEngagementScore?.toFixed(2) || '0',
    },
  ];

  const sentimentData = overview?.sentimentDistribution;

  // Prepare sentiment pie data
  const sentimentPieData = [
    { name: t('common.positive'), value: sentimentData?.positive || 0 },
    { name: t('common.neutral'), value: sentimentData?.neutral || 0 },
    { name: t('common.negative'), value: sentimentData?.negative || 0 },
  ];

  const sentimentTotal =
    (sentimentData?.positive || 0) +
    (sentimentData?.neutral || 0) +
    (sentimentData?.negative || 0);

  // Format trend data for charts
  const dailyTrendData = trends?.dailyPosts?.slice(-7).map((item: any) => ({
    date: formatLocaleDate(item.date),
    count: item.count,
    engagement: item.engagement,
  })) || [];

  const sentimentTiles = [
    {
      label: t('common.positive'),
      value: sentimentData?.positive || 0,
      pct: formatPercentage(sentimentTotal ? (sentimentData?.positive || 0) / sentimentTotal : 0),
      bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      labelText: 'text-emerald-800 dark:text-emerald-300',
    },
    {
      label: t('common.neutral'),
      value: sentimentData?.neutral || 0,
      pct: formatPercentage(sentimentTotal ? (sentimentData?.neutral || 0) / sentimentTotal : 0),
      bg: 'bg-muted border-border',
      text: 'text-muted-foreground',
      labelText: 'text-card-foreground',
    },
    {
      label: t('common.negative'),
      value: sentimentData?.negative || 0,
      pct: formatPercentage(sentimentTotal ? (sentimentData?.negative || 0) / sentimentTotal : 0),
      bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      labelText: 'text-red-800 dark:text-red-300',
    },
  ];

  const activityTiles = [
    { label: t('dashboard.last24Hours'), value: formatNumber(overview?.recentActivity?.last24Hours || 0), bg: 'bg-primary/10 text-primary' },
    { label: t('dashboard.last7Days'), value: formatNumber(overview?.recentActivity?.last7Days || 0), bg: 'bg-purple-500/10 text-purple-500' },
    { label: t('dashboard.last30Days'), value: formatNumber(overview?.recentActivity?.last30Days || 0), bg: 'bg-emerald-500/10 text-emerald-500' },
  ];

  const engagementTiles = [
    { label: t('common.likes'), value: formatCompactNumber(postStats?.totalLikes || 0), icon: ThumbsUp, bg: 'bg-primary/10 text-primary' },
    { label: t('common.comments'), value: formatCompactNumber(postStats?.totalComments || 0), icon: MessageCircle, bg: 'bg-emerald-500/10 text-emerald-500' },
    { label: t('common.shares'), value: formatCompactNumber(postStats?.totalShares || 0), icon: Share2, bg: 'bg-purple-500/10 text-purple-500' },
    { label: t('common.views'), value: formatCompactNumber(postStats?.totalViews || 0), icon: Eye, bg: 'bg-orange-500/10 text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.overview')}
        description={t('dashboard.overviewDescription')}
      >
        <button
          onClick={() => scrapeMutation.mutate()}
          disabled={scrapeMutation.isPending}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scrapeMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {t('dashboard.scrapeNow')}
        </button>
        <button
          onClick={() => threadsScrapeMutation.mutate()}
          disabled={threadsScrapeMutation.isPending || scrapeMutation.isPending}
          className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
        >
          {threadsScrapeMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {t('dashboard.scrapeThreads')}
        </button>
        <AutoRefreshToggle
          isEnabled={autoRefresh.isEnabled}
          countdown={autoRefresh.countdown}
          onToggle={autoRefresh.toggle}
          interval={30}
        />
        <ExportButton
          onExport={handleExport}
          label={t('dashboard.exportDashboard')}
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

      {/* Scraping Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-card-foreground">{t('dashboard.scrapingStatus')}</h2>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              scrapingStatus?.busy
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
            }`}
          >
            {scrapingStatus?.busy ? t('dashboard.scrapingInProgress') : t('dashboard.idle')}
          </span>
        </div>

        {isLoadingScraping ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.loadingStatus')}</p>
        ) : !scrapingStatus?.jobs?.length ? (
          <p className="text-sm text-muted-foreground">
            {t('dashboard.noScrapingData')}
          </p>
        ) : (
          <div className="space-y-3">
            {scrapingStatus.jobs.map((job: any) => (
              <div
                key={job.id}
                className="p-4 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-card-foreground capitalize">
                    {getPlatformLabel(job.platformType, job.platformName)}
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      job.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                        : job.status === 'failed'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                    }`}
                  >
                    {job.status === 'completed'
                      ? t('dashboard.jobStatusCompleted')
                      : job.status === 'failed'
                      ? t('dashboard.jobStatusFailed')
                      : job.status === 'running'
                      ? t('dashboard.jobStatusRunning')
                      : t('dashboard.jobStatusPending')}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium">{t('common.lastRun')}</span>
                    {job.startedAt ? formatDateTime(job.startedAt) : '-'}
                  </p>
                  <p>
                    <span className="font-medium">{t('common.duration')}</span>
                    {job.durationSeconds !== null ? t('dashboard.durationValue', { seconds: job.durationSeconds }) : '-'}
                  </p>
                  <p>
                    <span className="font-medium">{t('common.postsCollected')}</span>
                    {formatNumber(job.postsInDatabase ?? 0)}
                  </p>
                  <p>
                    <span className="font-medium">{t('common.errors')}</span>
                    {formatNumber(job.errorsCount)}
                  </p>
                </div>
                {job.status === 'failed' && job.errorMessage && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {job.errorMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <TrendChart
            data={dailyTrendData}
            title={t('dashboard.postsTrend')}
          />
        </Card>

        <Card className="p-6">
          <CustomPieChart
            data={sentimentPieData}
            title={t('dashboard.sentimentDistribution')}
            colors={['#10b981', '#64748b', '#ef4444']}
          />
        </Card>
      </div>

      {/* Sentiment Distribution */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">
          {t('dashboard.sentimentBreakdown')}
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
            {t('dashboard.recentActivity')}
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
            {t('dashboard.platformStats')}
          </h2>
          <div className="space-y-3">
            <div className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 p-4 text-white shadow-card-hover">
              <p className="text-sm font-medium opacity-90">{t('dashboard.topPlatform')}</p>
              <p className="mt-1 text-2xl font-bold">
                {overview?.topPlatform?.name || t('common.nA')}
              </p>
              <p className="mt-1 text-sm opacity-90">
                {formatNumber(overview?.topPlatform?.postsCount || 0)} {t('common.posts')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3">
                <ThumbsUp className="mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t('dashboard.totalEngagement')}</p>
                <p className="text-lg font-bold text-card-foreground">
                  {formatCompactNumber(overview?.totalEngagement || 0)}
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-3">
                <Globe className="mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t('common.platform')}</p>
                <p className="text-lg font-bold text-card-foreground">
                  {t('dashboard.platformsActive', { count: platforms?.length || 0 })}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">
          {t('dashboard.engagementOverview')}
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