'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { formatNumber, formatPercentage, formatCompactNumber, formatLocaleDate } from '@/lib/format';
import { TrendingUp, BarChart3, Hash, Heart, Activity, PieChart, ThumbsUp, MessageCircle, Share2, Filter, X } from 'lucide-react';
import { SentimentBarChart } from '@/components/charts/sentiment-bar-chart';
import { CustomPieChart } from '@/components/charts/pie-chart';
import { TrendChart } from '@/components/charts/trend-chart';
import { EngagementAreaChart } from '@/components/charts/area-chart';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const { t } = useI18n();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [platformId, setPlatformId] = useState('');

  const filterParams = useMemo(() => {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (platformId) params.platformId = platformId;
    return params;
  }, [startDate, endDate, platformId]);

  const hasFilters = startDate || endDate || platformId;

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiClient.getPlatforms(),
  });

  const { data: sentiment } = useQuery({
    queryKey: ['sentiment-analytics', filterParams],
    queryFn: () => apiClient.getSentimentAnalytics(filterParams),
  });

  const { data: engagement } = useQuery({
    queryKey: ['engagement-analytics', filterParams],
    queryFn: () => apiClient.getEngagementAnalytics(filterParams),
  });

  const { data: topHashtags } = useQuery({
    queryKey: ['analytics-hashtags'],
    queryFn: () => apiClient.getTopHashtags(20),
  });

  const { data: trends } = useQuery({
    queryKey: ['trends', filterParams],
    queryFn: () => apiClient.getTrends(filterParams),
  });

  const sentimentTotal =
    (sentiment?.overall?.positive || 0) +
    (sentiment?.overall?.neutral || 0) +
    (sentiment?.overall?.negative || 0);

  // Prepare sentiment pie data
  const sentimentPieData = [
    { name: t('common.positive'), value: sentiment?.overall?.positive || 0 },
    { name: t('common.neutral'), value: sentiment?.overall?.neutral || 0 },
    { name: t('common.negative'), value: sentiment?.overall?.negative || 0 },
  ];

  // Prepare sentiment by platform data for bar chart
  const platformSentimentData = sentiment?.byPlatform?.map((platform: any) => ({
    platform: platform.platformName,
    positive: platform.positive,
    neutral: platform.neutral,
    negative: platform.negative,
  })) || [];

  // Format trend data for charts
  const dailyTrendData = trends?.dailyPosts?.slice(-14).map((item: any) => ({
    date: formatLocaleDate(item.date),
    count: item.count,
    engagement: item.engagement,
  })) || [];

  // Prepare engagement over time data
  const engagementOverTimeData = trends?.dailyPosts?.slice(-14).map((item: any) => ({
    date: formatLocaleDate(item.date),
    likes: item.likes || 0,
    comments: item.comments || 0,
    shares: item.shares || 0,
  })) || [];

  const quickStats = [
    {
      label: t('analytics.positiveRate'),
      value: formatPercentage(sentimentTotal ? (sentiment?.overall?.positive || 0) / sentimentTotal : 0),
      icon: Activity,
      gradient: 'from-emerald-500 to-emerald-600',
      iconColor: 'text-emerald-200',
      labelColor: 'text-emerald-100',
    },
    {
      label: t('analytics.totalEngagement'),
      value: formatCompactNumber((engagement?.totalLikes || 0) + (engagement?.totalComments || 0) + (engagement?.totalShares || 0)),
      icon: Heart,
      gradient: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-200',
      labelColor: 'text-blue-100',
    },
    {
      label: t('analytics.avgEngagement'),
      value: engagement?.avgEngagementPerPost?.toFixed(1) || '0',
      icon: BarChart3,
      gradient: 'from-purple-500 to-purple-600',
      iconColor: 'text-purple-200',
      labelColor: 'text-purple-100',
    },
    {
      label: t('analytics.topHashtags'),
      value: topHashtags?.length || 0,
      icon: Hash,
      gradient: 'from-orange-500 to-orange-600',
      iconColor: 'text-orange-200',
      labelColor: 'text-orange-100',
    },
  ];

  const sentimentStatTiles = [
    { label: t('common.positive'), value: sentiment?.overall?.positive || 0, bg: 'bg-emerald-50 dark:bg-emerald-500/10', valueColor: 'text-emerald-600 dark:text-emerald-400', labelColor: 'text-emerald-900 dark:text-emerald-200' },
    { label: t('common.neutral'), value: sentiment?.overall?.neutral || 0, bg: 'bg-muted', valueColor: 'text-muted-foreground', labelColor: 'text-card-foreground' },
    { label: t('common.negative'), value: sentiment?.overall?.negative || 0, bg: 'bg-red-50 dark:bg-red-500/10', valueColor: 'text-red-600 dark:text-red-400', labelColor: 'text-red-900 dark:text-red-200' },
  ];

  const engagementStatTiles = [
    {
      label: t('analytics.totalLikes'),
      value: formatCompactNumber(engagement?.totalLikes || 0),
      sub: t('analytics.avgPerPost', { avg: engagement?.avgLikesPerPost?.toFixed(1) || 0 }),
      gradient: 'from-red-50 to-pink-50 dark:from-red-500/10 dark:to-pink-500/10 border-red-100 dark:border-red-500/20',
      color: 'text-red-600 dark:text-red-400',
    },
    {
      label: t('analytics.totalComments'),
      value: formatCompactNumber(engagement?.totalComments || 0),
      sub: t('analytics.avgPerPost', { avg: engagement?.avgCommentsPerPost?.toFixed(1) || 0 }),
      gradient: 'from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 border-blue-100 dark:border-blue-500/20',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: t('analytics.totalShares'),
      value: formatCompactNumber(engagement?.totalShares || 0),
      sub: t('analytics.avgPerPost', { avg: engagement?.avgSharesPerPost?.toFixed(1) || 0 }),
      gradient: 'from-purple-50 to-indigo-50 dark:from-purple-500/10 dark:to-indigo-500/10 border-purple-100 dark:border-purple-500/20',
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: t('analytics.totalViews'),
      value: formatCompactNumber(engagement?.totalViews || 0),
      sub: t('analytics.acrossAllPlatforms'),
      gradient: 'from-orange-50 to-yellow-50 dark:from-orange-500/10 dark:to-yellow-500/10 border-orange-100 dark:border-orange-500/20',
      color: 'text-orange-600 dark:text-orange-400',
    },
  ];

  const platformBars = (platform: any) => {
    const total = platform.positive + platform.neutral + platform.negative;
    const positivePercent = total > 0 ? (platform.positive / total) * 100 : 0;
    const neutralPercent = total > 0 ? (platform.neutral / total) * 100 : 0;
    const negativePercent = total > 0 ? (platform.negative / total) * 100 : 0;
    return [
      { label: t('common.positive'), pct: positivePercent, text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' },
      { label: t('common.neutral'), pct: neutralPercent, text: 'text-card-foreground', bar: 'bg-muted-foreground' },
      { label: t('common.negative'), pct: negativePercent, text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500' },
    ];
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setPlatformId('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('analytics.title')}
        description={t('analytics.description')}
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-card-foreground">{t('analytics.filterByDateRange')}</span>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('analytics.startDate')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('analytics.endDate')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('analytics.filterByPlatform')}</label>
            <select
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value)}
              className="rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="">{t('analytics.allPlatforms')}</option>
              {platforms?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" />
              {t('analytics.clearFilters')}
            </Button>
          )}
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-xl bg-gradient-to-br ${stat.gradient} p-6 text-white shadow-card`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${stat.labelColor}`}>{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                </div>
                <Icon className={cn('h-10 w-10', stat.iconColor)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <CustomPieChart
            data={sentimentPieData}
            title={t('analytics.overallSentiment')}
            colors={['#10b981', '#64748b', '#ef4444']}
          />
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            {sentimentStatTiles.map((tile) => (
              <div key={tile.label} className={cn('rounded-xl p-3', tile.bg)}>
                <p className={cn('text-2xl font-bold', tile.valueColor)}>
                  {formatNumber(tile.value)}
                </p>
                <p className={cn('mt-1 text-xs', tile.labelColor)}>{tile.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <TrendChart data={dailyTrendData} title={t('analytics.postsEngagementTrend')} />
        </Card>
      </div>

      {/* Sentiment by Platform Bar Chart */}
      <Card className="p-6">
        <SentimentBarChart
          data={platformSentimentData}
          title={t('analytics.sentimentByPlatform')}
        />
      </Card>

      {/* Engagement Area Chart */}
      <Card className="p-6">
        <EngagementAreaChart
          data={engagementOverTimeData}
          title={t('analytics.engagementOverTime')}
        />
      </Card>

      {/* Engagement Stats Grid */}
      <Card className="p-6">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-card-foreground">
          <Heart className="mr-2 h-5 w-5 text-red-500" />
          {t('analytics.engagementStatistics')}
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {engagementStatTiles.map((tile) => (
            <div key={tile.label} className={cn('rounded-xl border bg-gradient-to-br p-4 text-center', tile.gradient)}>
              <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
              <p className={cn('mt-2 text-3xl font-bold', tile.color)}>
                {tile.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {tile.sub}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Hashtags Cloud */}
      <Card className="p-6">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-card-foreground">
          <Hash className="mr-2 h-5 w-5 text-primary" />
          {t('analytics.topTrendingHashtags')}
        </h2>
        <div className="flex flex-wrap gap-3">
          {topHashtags?.slice(0, 30).map((item: any, idx: number) => {
            const size = Math.max(12, Math.min(20, 12 + (item.count / 10)));
            const opacity = Math.max(0.5, Math.min(1, item.count / 50));
            return (
              <div
                key={idx}
                className="cursor-pointer rounded-full border border-blue-200 bg-primary/5 px-4 py-2 transition-all duration-200 hover:border-primary/40 hover:shadow-card-hover dark:border-blue-500/20"
                style={{ fontSize: `${size}px`, opacity }}
              >
                <span className="font-medium text-blue-900 dark:text-blue-200">{item.hashtag}</span>
                <span className="ml-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(item.count)}
                </span>
              </div>
            );
          })}
        </div>
        {(!topHashtags || topHashtags.length === 0) && (
          <p className="py-8 text-center text-muted-foreground">
            {t('analytics.noHashtagsData')}
          </p>
        )}
      </Card>

      {/* Top Engaging Posts */}
      {engagement?.topEngagingPosts && engagement.topEngagingPosts.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 flex items-center text-lg font-semibold text-card-foreground">
            <TrendingUp className="mr-2 h-5 w-5 text-emerald-500" />
            {t('analytics.topEngagingPosts')}
          </h2>
          <div className="space-y-3">
            {engagement.topEngagingPosts.slice(0, 5).map((post: any, idx: number) => (
              <div key={post.id} className="rounded-xl border border-border p-4 transition-all duration-200 hover:bg-accent hover:border-primary/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center space-x-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-500/10 dark:text-purple-300">
                        {post.platform}
                      </span>
                      <span
                        className={cn(
                          'rounded px-2 py-1 text-xs font-medium',
                          post.sentiment === 'positive'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : post.sentiment === 'negative'
                              ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {post.sentiment || t('common.neutral').toLowerCase()}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-card-foreground/90">{post.content}</p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {formatCompactNumber(post.likesCount || 0)}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {formatCompactNumber(post.commentsCount || 0)}</span>
                      <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> {formatCompactNumber(post.sharesCount || 0)}</span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {post.engagementScore.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('analytics.engagementLabel')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sentiment by Platform Detail */}
      <Card className="p-6">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-card-foreground">
          <PieChart className="mr-2 h-5 w-5 text-indigo-500" />
          {t('analytics.detailedSentiment')}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sentiment?.byPlatform?.map((platform: any) => {
            const bars = platformBars(platform);
            const total = platform.positive + platform.neutral + platform.negative;
            return (
              <div key={platform.platformName} className="rounded-xl border border-border p-4 transition-all duration-200 hover:shadow-card-hover">
                <h3 className="mb-3 text-center font-semibold text-card-foreground">{platform.platformName}</h3>

                {/* Progress bars */}
                <div className="mb-3 space-y-2">
                  {bars.map((bar) => (
                    <div key={bar.label}>
                      <div className={cn('mb-1 flex justify-between text-xs', bar.text)}>
                        <span>{bar.label}</span>
                        <span className="font-bold">{bar.pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={cn('h-2 rounded-full transition-all duration-500', bar.bar)}
                          style={{ width: `${bar.pct}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Counts */}
                <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatNumber(platform.positive)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('common.positive')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-muted-foreground">
                      {formatNumber(platform.neutral)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('common.neutral')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {formatNumber(platform.negative)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('common.negative')}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(!sentiment?.byPlatform || sentiment.byPlatform.length === 0) && (
          <p className="py-8 text-center text-muted-foreground">
            {t('analytics.noPlatformSentiment')}
          </p>
        )}
      </Card>
    </div>
  );
}