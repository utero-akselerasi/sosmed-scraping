'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatRelativeTime, getSentimentColor, getPlatformColor } from '@/lib/format';
import { Search, Filter, ExternalLink, ThumbsUp, MessageCircle, Share2, Eye, TrendingUp } from 'lucide-react';
import { Post, SentimentType } from '@/types';
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

export default function PostsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sentiment, setSentiment] = useState<string>('');
  const [platformId, setPlatformId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { success, error } = useToast();

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', page, search, sentiment, platformId, startDate, endDate],
    queryFn: () => apiClient.getPosts({
      page,
      limit: 20,
      search: search || undefined,
      sentiment: sentiment || undefined,
      platformId: platformId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy: 'postedAt',
      sortOrder: 'DESC',
    }),
  });

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiClient.getPlatforms(),
  });

  const { data: stats } = useQuery({
    queryKey: ['posts-stats', sentiment, platformId, startDate, endDate],
    queryFn: () => apiClient.getPostsStats({
      sentiment: sentiment || undefined,
      platformId: platformId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleExportCSV = () => {
    try {
      if (postsData?.data) {
        ExportService.exportPosts(postsData.data);
        success('Export Successful', `Exported ${postsData.data.length} posts to CSV`);
      }
    } catch (err) {
      error('Export Failed', 'Failed to export posts. Please try again.');
    }
  };

  const handleExportJSON = () => {
    try {
      if (postsData?.data) {
        ExportService.downloadJSON(postsData.data, `posts_export_${new Date().toISOString().split('T')[0]}`);
        success('Export Successful', `Exported ${postsData.data.length} posts to JSON`);
      }
    } catch (err) {
      error('Export Failed', 'Failed to export posts. Please try again.');
    }
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handleApplyPreset = (preset: any) => {
    // Apply preset filters
    if (preset.filters.sentiment) {
      setSentiment(preset.filters.sentiment);
    } else {
      setSentiment('');
    }

    if (preset.filters.platformId) {
      setPlatformId(preset.filters.platformId);
    } else {
      setPlatformId('');
    }

    if (preset.filters.search) {
      setSearch(preset.filters.search);
    }

    if (preset.filters.startDate) {
      setStartDate(preset.filters.startDate);
    }

    if (preset.filters.endDate) {
      setEndDate(preset.filters.endDate);
    }

    setPage(1);
    success('Preset Applied', `Applied "${preset.name}" preset`);
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

  const statTiles = stats
    ? [
        { label: 'Total Posts', value: formatNumber(stats.totalPosts), bg: 'bg-muted/50 text-card-foreground' },
        { label: 'Positive', value: formatNumber(stats.sentimentDistribution?.positive || 0), bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
        { label: 'Neutral', value: formatNumber(stats.sentimentDistribution?.neutral || 0), bg: 'bg-muted/50 text-muted-foreground' },
        { label: 'Negative', value: formatNumber(stats.sentimentDistribution?.negative || 0), bg: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posts"
        description={postsData?.meta?.total ? `${formatNumber(postsData.meta.total)} total posts` : '0 total posts'}
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

      {/* Filter Presets & Date Range */}
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
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-card-foreground">Filters</h2>
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-card-foreground">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by content, author, hashtags..."
                className={cn(inputClasses, 'pl-10')}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-card-foreground">
              Sentiment
            </label>
            <select
              value={sentiment}
              onChange={(e) => {
                setSentiment(e.target.value);
                setPage(1);
              }}
              className={inputClasses}
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-card-foreground">
              Platform
            </label>
            <select
              value={platformId}
              onChange={(e) => {
                setPlatformId(e.target.value);
                setPage(1);
              }}
              className={inputClasses}
            >
              <option value="">All Platforms</option>
              {platforms?.map((platform: any) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Card>

      {/* Posts List */}
      {isLoading ? (
        <Card className="p-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading posts...</p>
        </Card>
      ) : postsData?.data && postsData.data.length > 0 ? (
        <>
          <div className="space-y-4">
            {postsData.data.map((post: any) => (
              <Card
                key={post.id}
                interactive
                className="p-6"
                onClick={() => handlePostClick(post)}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-white">
                      {post.influencerName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground">{post.influencerName}</p>
                      <p className="text-sm text-muted-foreground">@{post.influencerUsername}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', getPlatformColor(post.platformName || ''))}>
                      {post.platformName}
                    </span>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', getSentimentColor(post.sentiment as SentimentType))}>
                      {post.sentiment}
                    </span>
                  </div>
                </div>

                <p className="mb-3 line-clamp-3 text-card-foreground/90">{post.content}</p>

                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <img
                    src={post.mediaUrls[0]}
                    alt={post.content || post.platformPostId}
                    className="mb-3 max-h-72 w-full rounded-xl border border-border object-cover"
                    loading="lazy"
                  />
                )}

                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {post.hashtags.slice(0, 5).map((tag: any, idx: number) => (
                      <span key={idx} className="text-sm text-primary">
                        #{tag}
                      </span>
                    ))}
                    {post.hashtags.length > 5 && (
                      <span className="text-sm text-muted-foreground">+{post.hashtags.length - 5} more</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {formatNumber(post.likesCount)}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {formatNumber(post.commentsCount)}</span>
                    <span className="flex items-center gap-1"><Share2 className="h-4 w-4" /> {formatNumber(post.sharesCount)}</span>
                    {post.viewsCount > 0 && <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {formatNumber(post.viewsCount)}</span>}
                    <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-4 w-4" /> {post.engagementScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(post.postedAt)}
                    </span>
                    {post.postUrl && (
                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open original post"
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
                Showing {(postsData.meta.page - 1) * postsData.meta.limit + 1} to{' '}
                {Math.min(postsData.meta.page * postsData.meta.limit, postsData.meta.total)} of{' '}
                {formatNumber(postsData.meta.total)} posts
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <span className="rounded-lg bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  Page {page} of {postsData.meta.totalPages}
                </span>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= postsData.meta.totalPages}
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-lg text-card-foreground">No posts found</p>
          <p className="mt-2 text-sm text-muted-foreground">Try adjusting your filters</p>
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