'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatCompactNumber } from '@/lib/format';
import { Search, TrendingUp, Users, Award } from 'lucide-react';
import { Influencer } from '@/types';
import { ExportDropdown } from '@/components/export-button';
import { ExportService } from '@/lib/export/export-service';

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

  const handleExportCSV = () => {
    if (influencersData?.data) {
      ExportService.exportInfluencers(influencersData.data);
    }
  };

  const handleExportJSON = () => {
    if (influencersData?.data) {
      ExportService.downloadJSON(influencersData.data, `influencers_export_${new Date().toISOString().split('T')[0]}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Influencers</h1>
          <p className="mt-1 text-sm text-gray-600">
            {influencersData?.meta?.total ? formatNumber(influencersData.meta.total) : 0} influencers
          </p>
        </div>
        <ExportDropdown 
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          disabled={!influencersData?.data || influencersData.data.length === 0}
        />
      </div>

      {/* Top Influencers */}
      {topInfluencers && topInfluencers.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center mb-4">
            <Award className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-bold">Top 5 Influencers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topInfluencers.map((influencer: Influencer, idx: number) => (
              <div key={influencer.id} className="bg-white bg-opacity-20 backdrop-blur rounded-lg p-4 text-center">
                <div className="text-3xl font-bold mb-2">#{idx + 1}</div>
                <div className="w-16 h-16 bg-white rounded-full mx-auto mb-2 flex items-center justify-center text-2xl font-bold text-purple-600">
                  {influencer.name.charAt(0).toUpperCase()}
                </div>
                <p className="font-semibold truncate">{influencer.name}</p>
                <p className="text-sm opacity-90">@{influencer.username}</p>
                <p className="text-xs opacity-75 mt-2">{influencer.platform?.name}</p>
                <p className="text-lg font-bold mt-1">
                  {influencer.avgEngagementRate?.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
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
                placeholder="Search influencers..."
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

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="engagement_rate">Engagement Rate</option>
              <option value="followers_count">Followers</option>
              <option value="posts_count">Posts Count</option>
            </select>
          </div>
        </form>
      </div>

      {/* Influencers List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading influencers...</p>
          </div>
        </div>
      ) : influencersData?.data && influencersData.data.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {influencersData.data.map((influencer: Influencer) => (
              <div key={influencer.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {influencer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{influencer.name}</p>
                      <p className="text-sm text-gray-500">@{influencer.username}</p>
                    </div>
                  </div>
                  {influencer.isVerified && (
                    <span className="text-blue-500" title="Verified">
                      ✓
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                    {influencer.platform?.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-600">Followers</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCompactNumber(influencer.followersCount)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-600">Engagement</p>
                    <p className="text-lg font-bold text-gray-900">
                      {influencer.avgEngagementRate?.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Posts</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatNumber(influencer.postsCount)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Likes</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatCompactNumber(influencer.totalLikes || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Comments</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatCompactNumber(influencer.totalComments || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {influencersData.meta && influencersData.meta.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">
                Showing {(influencersData.meta.page - 1) * influencersData.meta.limit + 1} to{' '}
                {Math.min(influencersData.meta.page * influencersData.meta.limit, influencersData.meta.total)} of{' '}
                {formatNumber(influencersData.meta.total)} influencers
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
                  Page {page} of {influencersData.meta.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= influencersData.meta.totalPages}
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
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No influencers found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
