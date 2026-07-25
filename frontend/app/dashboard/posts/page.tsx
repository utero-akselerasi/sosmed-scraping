'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatRelativeTime, getSentimentColor, getPlatformColor, truncateText } from '@/lib/format';
import { Search, Filter, ExternalLink } from 'lucide-react';
import { Post, SentimentType } from '@/types';
import { ExportDropdown } from '@/components/export-button';
import { ExportService } from '@/lib/export/export-service';

export default function PostsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sentiment, setSentiment] = useState<string>('');
  const [platformId, setPlatformId] = useState<string>('');

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', page, search, sentiment, platformId],
    queryFn: () => apiClient.getPosts({
      page,
      limit: 20,
      search: search || undefined,
      sentiment: sentiment || undefined,
      platformId: platformId || undefined,
      sortBy: 'posted_at',
      sortOrder: 'DESC',
    }),
  });

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiClient.getPlatforms(),
  });

  const { data: stats } = useQuery({
    queryKey: ['posts-stats', sentiment, platformId],
    queryFn: () => apiClient.getPostsStats({
      sentiment: sentiment || undefined,
      platformId: platformId || undefined,
    }),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleExportCSV = () => {
    if (postsData?.data) {
      ExportService.exportPosts(postsData.data);
    }
  };

  const handleExportJSON = () => {
    if (postsData?.data) {
      ExportService.downloadJSON(postsData.data, `posts_export_${new Date().toISOString().split('T')[0]}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="mt-1 text-sm text-gray-600">
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
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Posts</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total)}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <p className="text-sm text-green-900">Positive</p>
            <p className="text-2xl font-bold text-green-600">{formatNumber(stats.bysentiment?.positive || 0)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-4">
            <p className="text-sm text-gray-900">Neutral</p>
            <p className="text-2xl font-bold text-gray-600">{formatNumber(stats.bysentiment?.neutral || 0)}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <p className="text-sm text-red-900">Negative</p>
            <p className="text-2xl font-bold text-red-600">{formatNumber(stats.bysentiment?.negative || 0)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts, hashtags, authors..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Platform Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <select
              value={platformId}
              onChange={(e) => {
                setPlatformId(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Platforms</option>
              {platforms?.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sentiment Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sentiment
            </label>
            <select
              value={sentiment}
              onChange={(e) => {
                setSentiment(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </form>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading posts...</p>
          </div>
        </div>
      ) : postsData?.data && postsData.data.length > 0 ? (
        <>
          <div className="space-y-4">
            {postsData.data.map((post: Post) => (
              <div key={post.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {post.authorName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{post.authorName}</p>
                      <p className="text-sm text-gray-500">@{post.authorUsername}</p>
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

                <p className="text-gray-700 mb-3">{post.content}</p>

                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.hashtags.map((tag, idx) => (
                      <span key={idx} className="text-blue-600 text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>❤️ {formatNumber(post.likesCount)}</span>
                    <span>💬 {formatNumber(post.commentsCount)}</span>
                    <span>🔁 {formatNumber(post.sharesCount)}</span>
                    {post.viewsCount > 0 && <span>👁️ {formatNumber(post.viewsCount)}</span>}
                    <span className="text-green-600 font-medium">
                      🎯 {post.engagementScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">
                      {formatRelativeTime(post.publishedAt)}
                    </span>
                    {post.postUrl && (
                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
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
            <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">
                Showing {(postsData.meta.page - 1) * postsData.meta.limit + 1} to{' '}
                {Math.min(postsData.meta.page * postsData.meta.limit, postsData.meta.total)} of{' '}
                {formatNumber(postsData.meta.total)} posts
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                  Page {page} of {postsData.meta.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= postsData.meta.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No posts found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
