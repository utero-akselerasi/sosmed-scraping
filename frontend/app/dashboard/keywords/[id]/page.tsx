'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import {
  formatNumber,
  formatCompactNumber,
  formatPercentage,
  formatLocaleDate,
  getPlatformColor,
  getPlatformLabel,
  getSentimentColor,
  getSentimentLabel,
} from '@/lib/format';
import Image from 'next/image';
import {
  ArrowLeft,
  TrendingUp,
  Heart,
  BarChart3,
  Hash,
  Users,
  MessageCircle,
  Share2,
  Eye,
  ExternalLink,
  ThumbsUp,
  Clock,
  Activity,
} from 'lucide-react';
import { TrendChart } from '@/components/charts/trend-chart';
import { CustomPieChart } from '@/components/charts/pie-chart';
import { EngagementAreaChart } from '@/components/charts/area-chart';
import { SentimentBarChart } from '@/components/charts/sentiment-bar-chart';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { PostDetailModal } from '@/components/ui/post-detail-modal';
import { cn } from '@/lib/utils';
import { KeywordOverview, Post } from '@/types';

export default function KeywordMonitoringPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const keywordId = params.id as string;

  const { data: keyword, isLoading: keywordLoading } = useQuery({
    queryKey: ['keyword', keywordId],
    queryFn: () => apiClient.getKeywords({ limit: 100 }),
    select: (data: any) => data?.data?.find((k: any) => k.id === keywordId),
  });

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['keyword-overview', keyword?.keyword],
    queryFn: () => apiClient.getKeywordOverview(keyword!.keyword),
    enabled: !!keyword?.keyword,
  });

  const isLoading = keywordLoading || overviewLoading;

  const growthIndicator = (rate: number) => {
    if (rate > 0) return { color: 'text-emerald-500', icon: '↑', text: `+${formatPercentage(rate)}` };
    if (rate < 0) return { color: 'text-red-500', icon: '↓', text: formatPercentage(rate) };
    return { color: 'text-muted-foreground', icon: '→', text: '0%' };
  };

  const dailyGrowth = growthIndicator(overview?.growthRate?.daily || 0);
  const weeklyGrowth = growthIndicator(overview?.growthRate?.weekly || 0);
  const monthlyGrowth = growthIndicator(overview?.growthRate?.monthly || 0);

  const sentimentData = overview ? [
    { name: t('common.positive'), value: overview.sentiment.positive },
    { name: t('common.neutral'), value: overview.sentiment.neutral },
    { name: t('common.negative'), value: overview.sentiment.negative },
  ] : [];

  const sentimentColors = ['#10b981', '#94a3b8', '#ef4444'];

  const platformData = overview?.platforms?.map((p: any) => ({
    name: p.name,
    positive: 0,
    neutral: 0,
    negative: 0,
  })) || [];

  const engagementChartData = overview?.dailyTrend?.map((d: any) => ({
    date: d.date,
    value: d.engagement,
  })) || [];

  const platformDistributionData = overview?.platforms?.map((p: any) => ({
    name: p.name,
    value: p.count,
  })) || [];

  const statTiles = overview
    ? [
        {
          label: t('keywords.totalMentions'),
          value: formatNumber(overview.totalPosts),
          sub: dailyGrowth.text,
          subColor: dailyGrowth.color,
          icon: Hash,
          gradient: 'from-blue-500 to-blue-600',
          iconColor: 'text-blue-200',
          labelColor: 'text-blue-100',
        },
        {
          label: t('keywords.totalEngagement'),
          value: formatCompactNumber(
            (overview.totalEngagement?.likes || 0) +
            (overview.totalEngagement?.comments || 0) +
            (overview.totalEngagement?.shares || 0),
          ),
          icon: Heart,
          gradient: 'from-emerald-500 to-emerald-600',
          iconColor: 'text-emerald-200',
          labelColor: 'text-emerald-100',
        },
        {
          label: t('keywords.avgEngagementScore'),
          value: overview.avgEngagementScore?.toFixed(1) || '0',
          icon: BarChart3,
          gradient: 'from-purple-500 to-purple-600',
          iconColor: 'text-purple-200',
          labelColor: 'text-purple-100',
        },
        {
          label: t('keywords.activePlatforms'),
          value: overview.platforms?.length || 0,
          sub: overview.platforms?.length
            ? t('keywords.acrossPlatforms', { count: overview.platforms.length })
            : '',
          icon: Activity,
          gradient: 'from-orange-500 to-orange-600',
          iconColor: 'text-orange-200',
          labelColor: 'text-orange-100',
        },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-[300px] animate-pulse rounded bg-muted" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!keyword) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-card-foreground">{t('keywords.monitoring')}</h1>
        </div>
        <Card className="p-12 text-center">
          <Hash className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-card-foreground">{t('keywords.noPosts')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <PageHeader
            title={t('keywords.monitoring')}
            description={t('keywords.monitoringDescription', { keyword: keyword.keyword })}
          />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statTiles.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden">
              <div className={cn('bg-gradient-to-br p-4', stat.gradient)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-sm font-medium', stat.labelColor)}>{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
                    {stat.sub && (
                      <p className={cn('mt-1 text-xs', stat.subColor || 'text-white/70')}>
                        {stat.sub}
                      </p>
                    )}
                  </div>
                  <Icon className={cn('h-8 w-8', stat.iconColor)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Growth Rates */}
      {overview && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">
            <TrendingUp className="mr-2 inline h-5 w-5" />
            {t('charts.growth')}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">{t('keywords.dailyGrowth')}</p>
              <p className={cn('mt-1 text-2xl font-bold', dailyGrowth.color)}>
                {dailyGrowth.icon} {dailyGrowth.text}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">{t('keywords.weeklyGrowth')}</p>
              <p className={cn('mt-1 text-2xl font-bold', weeklyGrowth.color)}>
                {weeklyGrowth.icon} {weeklyGrowth.text}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">{t('keywords.monthlyGrowth')}</p>
              <p className={cn('mt-1 text-2xl font-bold', monthlyGrowth.color)}>
                {monthlyGrowth.icon} {monthlyGrowth.text}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Charts Row 1: Trend + Sentiment */}
      {overview && overview.totalPosts > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <TrendChart
              data={overview.dailyTrend}
              title={t('keywords.mentionsTrend')}
            />
          </Card>
          <Card className="p-6">
            <CustomPieChart
              data={sentimentData}
              title={t('keywords.sentimentBreakdown')}
              colors={sentimentColors}
            />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-500/10">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {overview.sentiment.positive}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {t('common.positive')}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {overview.sentiment.neutral}
                </p>
                <p className="text-xs text-card-foreground">
                  {t('common.neutral')}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-500/10">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {overview.sentiment.negative}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  {t('common.negative')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Platform Distribution + Engagement Over Time */}
      {overview && overview.totalPosts > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <CustomPieChart
              data={platformDistributionData}
              title={t('keywords.platformDistribution')}
            />
          </Card>
          <Card className="p-6">
            <EngagementAreaChart
              data={engagementChartData}
              title={t('keywords.engagementOverTime')}
            />
          </Card>
        </div>
      )}

      {/* Top Posts */}
      {overview && overview.topPosts && overview.topPosts.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">
            <TrendingUp className="mr-2 inline h-5 w-5" />
            {t('keywords.topPosts')}
          </h3>
          <div className="space-y-4">
            {overview.topPosts.map((post: any, index: number) => (
              <div
                key={post.id}
                className="flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => setSelectedPost(post)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getPlatformColor(post.platformType || post.platformName || ''))}>
                      {getPlatformLabel(post.platformType, post.platformName)}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getSentimentColor(post.sentiment))}>
                      {getSentimentLabel(post.sentiment)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-card-foreground/90">{post.content}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" /> {formatNumber(post.likesCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> {formatNumber(post.commentsCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="h-3 w-3" /> {formatNumber(post.sharesCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {formatNumber(post.viewsCount)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-card-foreground">
                    {post.engagementScore?.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">score</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top Influencers */}
      {overview && overview.topInfluencers && overview.topInfluencers.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">
            <Users className="mr-2 inline h-5 w-5" />
            {t('keywords.topInfluencers')}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overview.topInfluencers.map((inf: any, index: number) => (
              <div
                key={inf.id}
                className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-white">
                  {inf.profilePictureUrl ? (
                    <Image
                      src={inf.profilePictureUrl}
                      alt={inf.fullName}
                      width={40}
                      height={40}
                      loader={({ src }) => src}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    inf.fullName?.charAt(0).toUpperCase() || inf.username?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {inf.fullName || inf.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">@{inf.username}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getPlatformColor(inf.platformName))}>
                      {inf.platformName}
                    </span>
                    {inf.isVerified && (
                      <span className="text-xs text-primary">✓</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-card-foreground">{inf.postCount}</p>
                  <p className="text-xs text-muted-foreground">{t('keywords.postCount', { count: '' }).replace(/\s*\{count\}\s*/, '').trim() || 'posts'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Mentions */}
      {overview && overview.recentPosts && overview.recentPosts.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">
            <Clock className="mr-2 inline h-5 w-5" />
            {t('keywords.recentMentions')}
          </h3>
          <div className="space-y-4">
            {overview.recentPosts.map((post: any) => (
              <div
                key={post.id}
                className="flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => setSelectedPost(post)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-white">
                  {post.influencerName?.charAt(0).toUpperCase() || post.influencerUsername?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-card-foreground">
                      {post.influencerName || post.influencerUsername || 'Unknown'}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getPlatformColor(post.platformType || post.platformName || ''))}>
                      {getPlatformLabel(post.platformType, post.platformName)}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getSentimentColor(post.sentiment))}>
                      {getSentimentLabel(post.sentiment)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-card-foreground/90">{post.content}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" /> {formatNumber(post.likesCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> {formatNumber(post.commentsCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="h-3 w-3" /> {formatNumber(post.sharesCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatLocaleDate(new Date(post.postedAt))}
                    </span>
                  </div>
                </div>
                {post.postUrl && (
                  <a
                    href={post.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {overview && overview.totalPosts === 0 && (
        <Card className="p-12 text-center">
          <Hash className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-card-foreground">{t('keywords.noPosts')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('keywords.noPostsHint')}</p>
        </Card>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}
