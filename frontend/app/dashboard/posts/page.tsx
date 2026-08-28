'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { formatNumber, formatRelativeTime, getSentimentColor, getPlatformColor, getPlatformLabel, getSentimentLabel } from '@/lib/format';
import { Search, Filter, ExternalLink, ThumbsUp, MessageCircle, Share2, Eye, TrendingUp, ArrowUpDown, AlertCircle } from 'lucide-react';
import { Post, Platform } from '@/types';
import { ExportDropdown } from '@/components/export-button';
import { ExportService } from '@/lib/export/export-service';
import { PostDetailModal } from '@/components/ui/post-detail-modal';
import { useToast } from '@/components/ui/toast';
import { FilterPresets } from '@/components/ui/filter-presets';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const inputClasses =
  'w-full rounded-lg border border-input bg-card px-4 py-2 text-sm text-card-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';

interface SortOption {
  value: string;
  order: 'ASC' | 'DESC';
  labelKey: string;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'postedAt', order: 'DESC', labelKey: 'posts.sortNewest' },
  { value: 'postedAt', order: 'ASC', labelKey: 'posts.sortOldest' },
  { value: 'engagementScore', order: 'DESC', labelKey: 'posts.sortMostEngagement' },
  { value: 'likesCount', order: 'DESC', labelKey: 'posts.sortMostLikes' },
  { value: 'commentsCount', order: 'DESC', labelKey: 'posts.sortMostComments' },
  { value: 'sharesCount', order: 'DESC', labelKey: 'posts.sortMostShared' },
];

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|avi)$/i.test(url) || url.includes('video');
}

export default function PostsPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortIdx, setSortIdx] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { success, error } = useToast();

  const currentSort = SORT_OPTIONS[sortIdx];

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const { data: postsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['posts', page, search, sentiment, platformId, startDate, endDate, currentSort.value, currentSort.order],
    queryFn: () => apiClient.getPosts({
      page,
      limit: 20,
      search: search || undefined,
      sentiment: sentiment || undefined,
      platformId: platformId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy: currentSort.value,
      sortOrder: currentSort.order,
    }),
  });

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiClient.getPlatforms(),
  });

  const { data: stats } = useQuery({
    queryKey: ['posts-stats', search, sentiment, platformId, startDate, endDate],
    queryFn: () => apiClient.getPostsStats({
      search: search || undefined,
      sentiment: sentiment || undefined,
      platformId: platformId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
  });

  const handleExportCSV = () => {
    try {
      if (postsData?.data) {
        ExportService.exportPosts(postsData.data);
        success(t('posts.exportSuccessful'), t('posts.exportedToCsv', { count: postsData.data.length }));
      }
    } catch {
      error(t('posts.exportFailed'), t('posts.exportFailedMsg'));
    }
  };

  const handleExportJSON = () => {
    try {
      if (postsData?.data) {
        ExportService.downloadJSON(postsData.data, `posts_export_${new Date().toISOString().split('T')[0]}`);
        success(t('posts.exportSuccessful'), t('posts.exportedToJson', { count: postsData.data.length }));
      }
    } catch {
      error(t('posts.exportFailed'), t('posts.exportFailedMsg'));
    }
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handleApplyPreset = (preset: { name: string; filters: Record<string, any> }) => {
    setSentiment(preset.filters.sentiment || '');
    setPlatformId(preset.filters.platformId || '');
    setSearch(preset.filters.search || '');
    setStartDate(preset.filters.startDate || '');
    setEndDate(preset.filters.endDate || '');
    setPage(1);
    success(t('posts.presetApplied'), t('posts.presetAppliedMsg', { name: preset.name }));
  };

  const getCurrentFilters = () => ({
    sentiment: sentiment || undefined,
    platformId: platformId || undefined,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const handleDateRangeChange = (start: string | null, end: string | null) => {
    setStartDate(start || '');
    setEndDate(end || '');
    setPage(1);
  };

  const hasActiveFilters = search || sentiment || platformId || startDate || endDate;

  const clearAllFilters = () => {
    setSearch('');
    setSentiment('');
    setPlatformId('');
    setStartDate('');
    setEndDate('');
    setSortIdx(0);
    setPage(1);
  };

  const statTiles = stats
    ? [
        { label: t('common.posts').charAt(0).toUpperCase() + t('common.posts').slice(1), value: formatNumber(stats.totalPosts), bg: 'bg-muted/50 text-card-foreground' },
        { label: t('common.positive'), value: formatNumber(stats.sentimentDistribution?.positive || 0), bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
        { label: t('common.neutral'), value: formatNumber(stats.sentimentDistribution?.neutral || 0), bg: 'bg-muted/50 text-muted-foreground' },
        { label: t('common.negative'), value: formatNumber(stats.sentimentDistribution?.negative || 0), bg: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('posts.title')}
        description={postsData?.meta?.total
          ? t('posts.totalLabel', { count: formatNumber(postsData.meta.total) })
          : t('posts.totalLabel', { count: '0' })}
      >
        <ExportDropdown
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          disabled={!postsData?.data || postsData.data.length === 0}
        />
      </PageHeader>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statTiles.map((tile) => (
            <div key={tile.label} className={cn('rounded-xl p-4 shadow-card', tile.bg)}>
              <p className="text-sm opacity-80">{tile.label}</p>
              <p className="text-2xl font-bold">{tile.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter Presets, Date Range, Sort & Clear */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterPresets
          onApplyPreset={handleApplyPreset}
          currentFilters={getCurrentFilters()}
        />
        <DateRangePicker
          startDate={startDate || null}
          endDate={endDate || null}
          onChange={handleDateRangeChange}
        />
        <div className="relative">
          <select
            value={sortIdx}
            onChange={(e) => setSortIdx(Number(e.target.value))}
            className={cn(inputClasses, 'w-auto pr-8')}
            aria-label={t('posts.sortBy')}
          >
            {SORT_OPTIONS.map((opt, idx) => (
              <option key={idx} value={idx}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
          <ArrowUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            {t('posts.clearFilters')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-card-foreground">{t('posts.filters')}</h2>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-card-foreground">
              {t('common.search')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('posts.searchPlaceholder')}
                className={cn(inputClasses, 'pl-10')}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-card-foreground">
              {t('common.sentiment')}
            </label>
            <select
              value={sentiment}
              onChange={(e) => {
                setSentiment(e.target.value);
                setPage(1);
              }}
              className={inputClasses}
            >
              <option value="">{t('common.allSentiments')}</option>
              <option value="positive">{t('common.positive')}</option>
              <option value="neutral">{t('common.neutral')}</option>
              <option value="negative">{t('common.negative')}</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-card-foreground">
              {t('common.platform')}
            </label>
            <select
              value={platformId}
              onChange={(e) => {
                setPlatformId(e.target.value);
                setPage(1);
              }}
              className={inputClasses}
            >
              <option value="">{t('common.allPlatforms')}</option>
              {platforms?.map((platform: Platform) => (
                <option key={platform.id} value={platform.id}>
                  {getPlatformLabel(platform.type, platform.name)}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Card>

      {/* Error State */}
      {isError && (
        <Card className="p-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg font-medium text-card-foreground">{t('posts.errorLoading')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('posts.errorLoadingHint')}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            {t('posts.retry')}
          </Button>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">{t('posts.loading')}</p>
        </Card>
      )}

      {/* Posts List */}
      {!isLoading && !isError && postsData?.data && postsData.data.length > 0 && (
        <>
          <div className="space-y-4">
            {postsData.data.map((post: Post) => (
              <Card
                key={post.id}
                interactive
                className="p-6"
                onClick={() => handlePostClick(post)}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-white">
                      {post.influencerName?.charAt(0).toUpperCase() || post.influencerUsername?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground">
                        {post.influencerName || t('posts.unknownAuthor')}
                      </p>
                      {post.influencerUsername && (
                        <p className="text-sm text-muted-foreground">@{post.influencerUsername}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', getPlatformColor(post.platformType || post.platformName || ''))}>
                      {getPlatformLabel(post.platformType, post.platformName)}
                    </span>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', getSentimentColor(post.sentiment))}>
                      {getSentimentLabel(post.sentiment)}
                    </span>
                  </div>
                </div>

                <p className="mb-3 line-clamp-3 text-card-foreground/90">{post.content}</p>

                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  isVideoUrl(post.mediaUrls[0]) ? (
                    <div className="mb-3 flex h-48 items-center justify-center rounded-xl border border-border bg-muted/50">
                      <span className="text-sm text-muted-foreground">{t('posts.videoContent')}</span>
                    </div>
                  ) : (
                    <img
                      src={post.mediaUrls[0]}
                      alt={post.content || post.platformPostId}
                      className="mb-3 max-h-72 w-full rounded-xl border border-border object-cover"
                      loading="lazy"
                    />
                  )
                )}

                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {post.hashtags.slice(0, 5).map((tag: string, idx: number) => (
                      <span key={idx} className="text-sm text-primary">
                        #{tag}
                      </span>
                    ))}
                    {post.hashtags.length > 5 && (
                      <span className="text-sm text-muted-foreground">
                        {t('posts.moreTags', { count: post.hashtags.length - 5 })}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {formatNumber(post.likesCount)}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {formatNumber(post.commentsCount)}</span>
                    <span className="flex items-center gap-1"><Share2 className="h-4 w-4" /> {formatNumber(post.sharesCount)}</span>
                    {post.viewsCount > 0 && <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {formatNumber(post.viewsCount)}</span>}
                    <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-4 w-4" /> {post.engagementScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(post.postedAt)}
                    </span>
                    {post.postUrl && (
                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t('posts.openOriginal')}
                        className="text-primary transition-colors hover:text-primary/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {postsData.meta && postsData.meta.totalPages > 1 && (
            <Card className="flex flex-col items-center justify-between gap-3 p-4 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                {t('posts.showingOf', {
                  start: (postsData.meta.page - 1) * postsData.meta.limit + 1,
                  end: Math.min(postsData.meta.page * postsData.meta.limit, postsData.meta.total),
                  total: formatNumber(postsData.meta.total),
                })}
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  {t('common.previous')}
                </Button>
                <span className="rounded-lg bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  {t('common.pageOf', { page, totalPages: postsData.meta.totalPages })}
                </span>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= postsData.meta.totalPages}
                  size="sm"
                >
                  {t('common.next')}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !isError && (!postsData?.data || postsData.data.length === 0) && (
        <Card className="p-12 text-center">
          <p className="text-lg text-card-foreground">{t('posts.noPosts')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('posts.noPostsHint')}</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" className="mt-4" onClick={clearAllFilters}>
              {t('posts.clearFilters')}
            </Button>
          )}
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
