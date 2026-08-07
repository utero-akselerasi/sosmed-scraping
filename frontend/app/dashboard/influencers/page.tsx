'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { formatNumber, formatCompactNumber } from '@/lib/format';
import { Search, TrendingUp, Users, Award, Eye, BadgeCheck } from 'lucide-react';
import { Influencer } from '@/types';
import { ExportDropdown } from '@/components/export-button';
import { ExportService } from '@/lib/export/export-service';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function InfluencersPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [platformId, setPlatformId] = useState<string>('');
  const [sortBy, setSortBy] = useState('engagementRate');

  const { data: influencersData, isLoading } = useQuery({
    queryKey: ['influencers', page, search, platformId, sortBy],
    queryFn: () => apiClient.getInfluencers({
      page,
      limit: 20,
      search: search || undefined,
      platformId: platformId || undefined,
      sortBy,
      sortOrder: 'DESC',
    }),
  });

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiClient.getPlatforms(),
  });

  const { data: topInfluencers } = useQuery({
    queryKey: ['top-influencers'],
    queryFn: () => apiClient.getTopInfluencers(5),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleExportCSV = () => {
    if (influencersData?.data) {
      ExportService.exportInfluencers(influencersData.data);
    }
  };

  const handleExportJSON = () => {
    if (influencersData?.data) {
      ExportService.exportInfluencers(influencersData.data);
    }
  };

  const selectClasses = 'w-full rounded-lg border border-input bg-card px-4 py-2 text-sm text-card-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('influencers.title')}
        description={t('influencers.description')}
      >
        <ExportDropdown
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          disabled={!influencersData?.data || influencersData.data.length === 0}
        />
      </PageHeader>

      {/* Top 5 Influencers */}
      {topInfluencers && topInfluencers.length > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white shadow-card-hover">
          <div className="mb-4 flex items-center gap-3">
            <Award className="h-6 w-6" />
            <h2 className="text-xl font-bold">{t('influencers.top5')}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {topInfluencers.map((influencer: Influencer, index: number) => (
              <Link
                key={influencer.id}
                href={`/dashboard/influencers/${influencer.id}`}
                className="rounded-xl bg-white/10 p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 text-2xl font-bold text-purple-900">
                      {influencer.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-sm font-bold text-purple-900">
                      #{index + 1}
                    </div>
                  </div>
                  <p className="mb-1 w-full truncate text-sm font-semibold">{influencer.fullName}</p>
                  <p className="mb-2 text-xs opacity-90">@{influencer.username}</p>
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="opacity-80">{t('common.followers')}</span>
                      <span className="font-semibold">{formatCompactNumber(influencer.followersCount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="opacity-80">{t('common.engagement')}</span>
                      <span className="font-semibold">{influencer.engagementRate?.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('influencers.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-card py-2 pl-10 pr-4 text-sm text-card-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <select
              value={platformId}
              onChange={(e) => {
                setPlatformId(e.target.value);
                setPage(1);
              }}
              className={selectClasses}
              aria-label={t('common.filterByPlatform')}
            >
              <option value="">{t('common.allPlatforms')}</option>
              {platforms?.map((platform: any) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-48">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className={selectClasses}
              aria-label={t('influencers.sortAria')}
            >
              <option value="engagementRate">{t('influencers.engagementRate')}</option>
              <option value="followersCount">{t('common.followers')}</option>
              <option value="postsCount">{t('influencers.postsCount')}</option>
            </select>
          </div>
        </form>
      </Card>

      {/* Influencers List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="mt-4 text-sm text-muted-foreground">{t('influencers.loading')}</p>
          </div>
        </div>
      ) : influencersData?.data && influencersData.data.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {influencersData.data.map((influencer: Influencer) => (
              <Link
                key={influencer.id}
                href={`/dashboard/influencers/${influencer.id}`}
                className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xl font-bold text-white transition-transform duration-200 group-hover:scale-110">
                      {influencer.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground transition-colors duration-200 group-hover:text-primary">{influencer.fullName}</p>
                      <p className="text-sm text-muted-foreground">@{influencer.username}</p>
                    </div>
                  </div>
                  {influencer.isVerified && (
                    <BadgeCheck className="h-5 w-5 text-primary" aria-label={t('common.verified')} />
                  )}
                </div>

                <div className="mb-4">
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-500/10 dark:text-purple-300">
                    {influencer.platformName}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-primary/5 p-3 text-center">
                    <Users className="mx-auto mb-1 h-5 w-5 text-primary" />
                    <p className="text-xs text-muted-foreground">{t('common.followers')}</p>
                    <p className="text-lg font-bold text-card-foreground">
                      {formatCompactNumber(influencer.followersCount)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/5 p-3 text-center">
                    <TrendingUp className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">{t('common.engagement')}</p>
                    <p className="text-lg font-bold text-card-foreground">
                      {influencer.engagementRate?.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{t('sidebar.posts')}</p>
                    <p className="text-sm font-bold text-card-foreground">
                      {formatNumber(influencer.postsCount)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{t('common.followers')}</p>
                    <p className="text-sm font-bold text-card-foreground">
                      {formatCompactNumber(influencer.followersCount)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{t('common.engagement')}</p>
                    <p className="text-sm font-bold text-card-foreground">
                      {influencer.engagementRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-center gap-1 text-sm text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Eye className="h-4 w-4" />
                  {t('influencers.detailTitle')}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {influencersData.meta && (
            <Card className="flex items-center justify-between p-4">
              <div className="text-sm text-muted-foreground">
                {t('influencers.showingOf', {
                  start: ((page - 1) * 20) + 1,
                  end: Math.min(page * 20, influencersData.meta.total),
                  total: influencersData.meta.total,
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  {t('common.previous')}
                </Button>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= influencersData.meta.totalPages}
                  size="sm"
                >
                  {t('common.next')}
                </Button>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-12 text-center">
          <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t('influencers.noInfluencers')}</p>
        </Card>
      )}
    </div>
  );
}