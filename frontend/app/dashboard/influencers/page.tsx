'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatCompactNumber } from '@/lib/format';
import { Search, TrendingUp, Users, Award, Eye } from 'lucide-react';
import { Influencer } from '@/types';
import { ExportDropdown } from '@/components/export-button';
import { ExportService } from '@/lib/export/export-service';
import Link from 'next/link';

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
      ExportService.exportInfluencersJSON(influencersData.data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Influencers</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Top performing influencers and content creators
          </p>
        </div>
        <ExportDropdown
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          disabled={!influencersData?.data || influencersData.data.length === 0}
        />
      </div>

      {/* Top 5 Influencers */}
      {topInfluencers && topInfluencers.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6" />
            <h2 className="text-xl font-bold">Top 5 Influencers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topInfluencers.map((influencer: Influencer, index: number) => (
              <Link
                key={influencer.id}
                href={`/dashboard/influencers/${influencer.id}`}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all cursor-pointer"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center text-purple-900 font-bold text-2xl">
                      {influencer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-purple-900 font-bold text-sm">
                      #{index + 1}
                    </div>
                  </div>
                  <p className="font-semibold text-sm mb-1 truncate w-full">{influencer.name}</p>
                  <p className="text-xs opacity-90 mb-2">@{influencer.username}</p>
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="opacity-80">Followers</span>
                      <span className="font-semibold">{formatCompactNumber(influencer.followersCount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="opacity-80">Engagement</span>
                      <span className="font-semibold">{influencer.avgEngagementRate?.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search influencers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

          <div className="w-full md:w-48">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading influencers...</p>
          </div>
        </div>
      ) : influencersData?.data && influencersData.data.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {influencersData.data.map((influencer: Influencer) => (
              <Link
                key={influencer.id}
                href={`/dashboard/influencers/${influencer.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all p-6 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform">
                      {influencer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{influencer.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@{influencer.username}</p>
                    </div>
                  </div>
                  {influencer.isVerified && (
                    <span className="text-blue-500" title="Verified">
                      ✓
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-xs font-medium">
                    {influencer.platform?.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Followers</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCompactNumber(influencer.followersCount)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Engagement</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {influencer.avgEngagementRate?.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Posts</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatNumber(influencer.postsCount)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Likes</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCompactNumber(influencer.totalLikes || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Comments</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCompactNumber(influencer.totalComments || 0)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-center text-sm text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {influencersData.meta && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, influencersData.meta.total)} of{' '}
                {influencersData.meta.total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= influencersData.meta.totalPages}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No influencers found</p>
        </div>
      )}
    </div>
  );
}