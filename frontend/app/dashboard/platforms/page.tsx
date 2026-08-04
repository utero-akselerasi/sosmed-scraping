'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatCompactNumber, getPlatformColor } from '@/lib/format';
import { Globe, TrendingUp, FileText, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

export default function PlatformsPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['platforms-overview'],
    queryFn: () => apiClient.getPlatformOverview(),
  });

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-muted-foreground">Loading platforms...</p>
      </div>
    );
  }

  const stats = [
    { label: 'Total Platforms', value: overview?.totalPlatforms || 0, icon: Globe, color: 'text-primary', iconBg: 'bg-primary/10' },
    { label: 'Active Platforms', value: overview?.activePlatforms || 0, icon: Globe, color: 'text-emerald-500', iconBg: 'bg-emerald-500/10' },
    { label: 'Total Posts', value: formatCompactNumber(overview?.totalPosts || 0), icon: FileText, color: 'text-purple-500', iconBg: 'bg-purple-500/10' },
    { label: 'Total Influencers', value: formatNumber(overview?.totalInfluencers || 0), icon: Users, color: 'text-orange-500', iconBg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platforms"
        description="Social media platforms monitoring"
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold text-card-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={cn('rounded-xl p-3', stat.iconBg)}>
                  <Icon className={cn('h-8 w-8', stat.color)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {overview?.platformStats?.map((platform: any) => (
          <Card key={platform.platformId} interactive className="p-0">
            {/* Platform Header */}
            <div className="border-b border-border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', getPlatformColor(platform.platformType))}>
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      {platform.platformName}
                    </h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {platform.platformType}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Active
                </span>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="p-6">
              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Posts</p>
                  <p className="text-xl font-bold text-card-foreground">
                    {formatCompactNumber(platform.totalPosts)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Influencers</p>
                  <p className="text-xl font-bold text-card-foreground">
                    {formatNumber(platform.totalInfluencers)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Likes</p>
                  <p className="text-xl font-bold text-card-foreground">
                    {formatCompactNumber(platform.totalLikes)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Comments</p>
                  <p className="text-xl font-bold text-card-foreground">
                    {formatCompactNumber(platform.totalComments)}
                  </p>
                </div>
              </div>

              {/* Engagement & Sentiment */}
              <div className="space-y-4">
                {/* Avg Engagement */}
                <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Avg Engagement Score</span>
                  </div>
                  <span className="text-sm font-bold text-card-foreground">
                    {platform.avgEngagementScore.toFixed(2)}
                  </span>
                </div>

                {/* Sentiment Distribution */}
                <div>
                  <p className="mb-2 text-sm font-medium text-card-foreground">Sentiment Distribution</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-emerald-50 p-2 text-center dark:bg-emerald-500/10">
                      <p className="text-xs text-emerald-900 dark:text-emerald-200">Positive</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatNumber(platform.sentimentDistribution.positive)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-xs text-card-foreground">Neutral</p>
                      <p className="text-lg font-bold text-muted-foreground">
                        {formatNumber(platform.sentimentDistribution.neutral)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 text-center dark:bg-red-500/10">
                      <p className="text-xs text-red-900 dark:text-red-200">Negative</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatNumber(platform.sentimentDistribution.negative)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}