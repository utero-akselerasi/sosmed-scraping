'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { formatNumber, formatCompactNumber, formatLocaleDate } from '@/lib/format';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import { CustomPieChart } from '@/components/charts/pie-chart';
import { EngagementAreaChart } from '@/components/charts/area-chart';
import { Card } from '@/components/ui/card';

export default function InfluencerDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const influencerId = params.id as string;

  const { data: influencer, isLoading: isLoadingInfluencer } = useQuery({
    queryKey: ['influencer', influencerId],
    queryFn: () => apiClient.getInfluencerById(influencerId),
  });

  const { data: engagementData, isLoading: isLoadingEngagement } = useQuery({
    queryKey: ['influencer-engagement', influencerId],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/influencers/${influencerId}/engagement?days=30`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch engagement data');
      return response.json();
    },
    enabled: !!influencerId,
  });

  const { data: contentTypeData, isLoading: isLoadingContentTypes } = useQuery({
    queryKey: ['influencer-content-types', influencerId],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/influencers/${influencerId}/content-types`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch content types');
      return response.json();
    },
    enabled: !!influencerId,
  });

  if (isLoadingInfluencer) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">{t('influencers.loadingDetail')}</p>
        </div>
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{t('influencers.notFound')}</p>
      </div>
    );
  }

  // Transform engagement data for chart
  const chartEngagementData = engagementData?.map((item: any) => ({
    date: formatLocaleDate(item.date),
    likes: item.likes,
    comments: item.comments,
    shares: item.shares,
  })) || [];

  // Transform content type data for pie chart
  const chartContentTypeData = contentTypeData?.map((item: any) => ({
    name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
    value: item.count,
  })) || [];

  const pieColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

  const mainStats = [
    { label: t('common.followers'), value: formatCompactNumber(influencer.followersCount), icon: Users, color: 'text-primary' },
    { label: t('influencers.totalPosts'), value: formatNumber(influencer.totalPosts || influencer.postsCount), icon: BarChart3, color: 'text-emerald-500' },
    { label: t('influencers.engagementRateValue'), value: `${influencer.engagementRate?.toFixed(2)}%`, icon: TrendingUp, color: 'text-purple-500' },
    { label: t('influencers.avgEngagement'), value: formatCompactNumber(influencer.avgEngagementScore || 0), icon: Heart, color: 'text-red-500' },
  ];

  const extraStats = [
    { label: t('influencers.totalLikes'), value: formatCompactNumber(influencer.totalLikes), icon: Heart, bg: 'bg-red-50 dark:bg-red-500/10', color: 'text-red-500' },
    { label: t('influencers.totalComments'), value: formatCompactNumber(influencer.totalComments), icon: MessageCircle, bg: 'bg-primary/5', color: 'text-primary' },
    { label: t('influencers.totalShares'), value: formatCompactNumber(influencer.totalShares), icon: Share2, bg: 'bg-emerald-500/5', color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          aria-label={t('influencers.goBack')}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-card-foreground">{t('influencers.detailTitle')}</h1>
      </div>

      {/* Profile Header */}
      <Card className="p-6">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {influencer.profilePictureUrl ? (
              <img
                src={influencer.profilePictureUrl}
                alt={influencer.fullName}
                className="h-20 w-20 rounded-full border-2 border-border object-cover shadow-card-hover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white shadow-card-hover">
                {influencer.fullName?.charAt(0).toUpperCase() || influencer.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-card-foreground">
                  {influencer.fullName || influencer.username}
                </h2>
                {influencer.isVerified && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{influencer.username}</p>
              <span className="mt-1 inline-block rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                {influencer.platformName}
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {influencer.bio && (
          <p className="mb-6 text-card-foreground/80">{influencer.bio}</p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {mainStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl bg-muted/50 p-4 text-center">
                <Icon className={`mx-auto mb-2 h-6 w-6 ${stat.color}`} />
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold text-card-foreground">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Additional Stats */}
        {influencer.totalLikes !== undefined && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            {extraStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`rounded-xl p-3 text-center ${stat.bg}`}>
                  <Icon className={`mx-auto mb-1 h-5 w-5 ${stat.color}`} />
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold text-card-foreground">
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Sentiment Distribution */}
      {influencer.sentimentDistribution && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">{t('influencers.sentimentAnalysis')}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-emerald-50 p-4 text-center dark:bg-emerald-500/10">
              <p className="text-sm text-emerald-900 dark:text-emerald-200">{t('common.positive')}</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {influencer.sentimentDistribution.positive}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-sm text-card-foreground">{t('common.neutral')}</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {influencer.sentimentDistribution.neutral}
              </p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 text-center dark:bg-red-500/10">
              <p className="text-sm text-red-900 dark:text-red-200">{t('common.negative')}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {influencer.sentimentDistribution.negative}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">
            {t('influencers.engagementOverTime')}
          </h3>
          {isLoadingEngagement ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : chartEngagementData.length > 0 ? (
            <EngagementAreaChart data={chartEngagementData} />
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              {t('influencers.noEngagementData')}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">{t('influencers.contentTypeDistribution')}</h3>
          {isLoadingContentTypes ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : chartContentTypeData.length > 0 ? (
            <CustomPieChart data={chartContentTypeData} colors={pieColors} />
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              {t('influencers.noContentTypeData')}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}