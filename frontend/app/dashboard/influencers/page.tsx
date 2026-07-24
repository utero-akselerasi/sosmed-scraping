'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatCompactNumber } from '@/lib/format';
import { Search, TrendingUp, Users, Award } from 'lucide-react';
import { Influencer } from '@/types';

export default function InfluencersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [platformId, setPlatformId] = useState<string>('');
  const [sortBy, setSortBy] = useState('engagement_rate');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Influencers</h1>
        <p className="mt-1 text-sm text-gray-600">
          {formatNumber(influencersData?.meta?.total || 0)} total influencers
        </p>
      </div>

      {/* Top Influencers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-yellow-500" />
          Top Influencers by Engagement
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {topInfluencers?.map((influencer: Influencer, idx: number) => (
            <div
              key={influencer.id}
              className="relative p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold">
                  {influencer.username?.charAt(0).toUpperCase()}
                </div>
                <p className="font-medium text-gray-900 truncate">
                  @{influencer.username}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {formatCompactNumber(influencer.followersCount)} followers
                </p>
                <p className="text-sm font-bold text-purple-600 mt-2">
                  {influencer.engagementRate.toFixed(2)}% ER
                </p>
              </div>
            </div>
          ))}
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
                placeholder="Search influencers..."
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

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="engagement_rate">Engagement Rate</option>
            <option value="followers_count">Followers</option>
            <option value="posts_count">Posts Count</option>
          </select>
        </div>
      </div>

      {/* Influencers List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading influencers...</p>
        </div>
      ) : influencersData?.data?.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No influencers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {influencersData?.data?.map((influencer: Influencer) => (
            <div
              key={influencer.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              {/* Profile */}
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {influencer.username?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      @{influencer.username}
                    </h3>
                    {influencer.isVerified && (
                      <span className="text-blue-500" title="Verified">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {influencer.fullName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {influencer.platformName}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {influencer.bio && (
                <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                  {influencer.bio}
                </p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Followers</p>
                  <p className="text-sm font-bold text-gray-900">
                    {formatCompactNumber(influencer.followersCount)}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Engagement</p>
                  <p className="text-sm font-bold text-gray-900">
                    {influencer.engagementRate.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-sm text-gray-600">
                <span>{formatNumber(influencer.followingCount)} following</span>
                <span>{formatNumber(influencer.postsCount)} posts</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {influencersData && influencersData.meta.totalPages > 1 && (
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
              Page {page} of {influencersData.meta.totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(influencersData.meta.totalPages, p + 1))}
              disabled={page === influencersData.meta.totalPages}
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
