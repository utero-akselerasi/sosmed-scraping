'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatRelativeTime, getSentimentColor, getPlatformColor, truncateText } from '@/lib/format';
import { Search, Filter, ExternalLink } from 'lucide-react';
import { Post, SentimentType } from '@/types';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="mt-1 text-sm text-gray-600">
            {formatNumber(postsData?.meta?.total || 0)} total posts
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Posts</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(stats?.totalPosts || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Likes</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(stats?.totalLikes || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Comments</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(stats?.totalComments || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Avg Engagement</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats?.avgEngagementScore?.toFixed(1) || '0'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Platform Filter */}
          <select
            value={platformId}
            onChange={(e) => {
              setPlatformId(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Platforms</option>
            {platforms?.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>

          {/* Sentiment Filter */}
          <select
            value={sentiment}
            onChange={(e) => {
              setSentiment(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading posts...</p>
        </div>
      ) : postsData?.data?.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No posts found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {postsData?.data?.map((post: Post) => (
            <div key={post.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {post.influencerUsername?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      @{post.influencerUsername}
                    </p>
                    <p className="text-sm text-gray-500">
                      {post.influencerName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getPlatformColor(post.platformType)}`}>
                    {post.platformName}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getSentimentColor(post.sentiment)}`}>
                    {post.sentiment}
                  </span>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-gray-700 mb-4">
                {truncateText(post.content, 200)}
              </p>

              {/* Hashtags */}
              {post.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.hashtags.slice(0, 5).map((hashtag, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded"
                    >
                      {hashtag}
                    </span>
                  ))}
                </div>
              )}

              {/* Post Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <span>❤️ {formatNumber(post.likesCount)}</span>
                  <span>💬 {formatNumber(post.commentsCount)}</span>
                  <span>🔄 {formatNumber(post.sharesCount)}</span>
                  {post.viewsCount > 0 && (
                    <span>👁️ {formatNumber(post.viewsCount)}</span>
                  )}
                  <span className="font-medium">
                    ⚡ {post.engagementScore.toFixed(1)}
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {formatRelativeTime(post.postedAt)}
                  </span>
                  {post.postUrl && (
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {postsData && postsData.meta.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <span className="text-sm text-gray-600">
              Page {page} of {postsData.meta.totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(postsData.meta.totalPages, p + 1))}
              disabled={page === postsData.meta.totalPages}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
