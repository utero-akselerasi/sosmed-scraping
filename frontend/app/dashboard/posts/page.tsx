'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatRelativeTime, getSentimentColor, getPlatformColor, truncateText } from '@/lib/format';
import { Search, Filter, ExternalLink } from 'lucide-react';
import { Post, SentimentType } from '@/types';
import { ExportDropdown } from '@/components/export-button';
import { ExportService } from '@/lib/export/export-service';
import { PostDetailModal } from '@/components/ui/post-detail-modal';
import { useToast } from '@/components/ui/toast';
import { FilterPresets } from '@/components/ui/filter-presets';
import { DateRangePicker } from '@/components/ui/date-range-picker';

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
      sortBy: 'posted_at',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Posts</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {postsData?.meta?.total ? formatNumber(postsData.meta.total) : 0} total posts
          </p>
        </div>
        <ExportDropdown 
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          disabled={!postsData?.data || postsData.data.length === 0}
        />
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Posts</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.total)}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-4">
            <p className="text-sm text-green-900 dark:text-green-300">Positive</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatNumber(stats.bysentiment?.positive || 0)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow p-4">
            <p className="text-sm text-gray-900 dark:text-gray-300">Neutral</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{formatNumber(stats.bysentiment?.neutral || 0)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-4">
            <p className="text-sm text-red-900 dark:text-red-300">Negative</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatNumber(stats.bysentiment?.negative || 0)}</p>
          </div>
        </div>
      )}

      {/* Filter Presets & Date Range */}
      <div className="flex items-center gap-3">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by content, author, hashtags..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Sentiment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sentiment
            </label>
            <select
              value={sentiment}
              onChange={(e) => {
                setSentiment(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Platform
            </label>
            <select
              value={platformId}
              onChange={(e) => {
                setPlatformId(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading posts...</p>
        </div>
      ) : postsData?.data && postsData.data.length > 0 ? (
        <>
          <div className="space-y-4">
            {postsData.data.map((post: any) => (
              <div 
                key={post.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handlePostClick(post)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {post.authorName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{post.authorName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@{post.authorUsername}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlatformColor(post.platform?.name || '')}`}>
                      {post.platform?.name}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(post.sentiment as SentimentType)}`}>
                      {post.sentiment}
                    </span>
                  </div>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">{post.content}</p>

                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.hashtags.slice(0, 5).map((tag: any, idx: number) => (
                      <span key={idx} className="text-blue-600 dark:text-blue-400 text-sm">
                        #{tag}
                      </span>
                    ))}
                    {post.hashtags.length > 5 && (
                      <span className="text-gray-500 dark:text-gray-400 text-sm">+{post.hashtags.length - 5} more</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>?? {formatNumber(post.likesCount)}</span>
                    <span>?? {formatNumber(post.commentsCount)}</span>
                    <span>?? {formatNumber(post.sharesCount)}</span>
                    {post.viewsCount > 0 && <span>??? {formatNumber(post.viewsCount)}</span>}
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ?? {post.engagementScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(post.publishedAt)}
                    </span>
                    {post.postUrl && (
                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {postsData.meta && postsData.meta.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(postsData.meta.page - 1) * postsData.meta.limit + 1} to{' '}
                {Math.min(postsData.meta.page * postsData.meta.limit, postsData.meta.total)} of{' '}
                {formatNumber(postsData.meta.total)} posts
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                >
                  Previous
                </button>
                <span className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                  Page {page} of {postsData.meta.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= postsData.meta.totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No posts found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Try adjusting your filters</p>
        </div>
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
