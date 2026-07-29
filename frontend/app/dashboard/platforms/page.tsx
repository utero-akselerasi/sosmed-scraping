'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatCompactNumber, formatPercentage, getPlatformColor } from '@/lib/format';
import { Globe, TrendingUp, Users, FileText } from 'lucide-react';

export default function PlatformsPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['platforms-overview'],
    queryFn: () => apiClient.getPlatformOverview(),
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading platforms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platforms</h1>
        <p className="mt-1 text-sm text-gray-600">
          Social media platforms monitoring
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Platforms</p>
              <p className="text-3xl font-bold text-gray-900">
                {overview?.totalPlatforms || 0}
              </p>
            </div>
            <Globe className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Platforms</p>
              <p className="text-3xl font-bold text-green-600">
                {overview?.activePlatforms || 0}
              </p>
            </div>
            <Globe className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Posts</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCompactNumber(overview?.totalPosts || 0)}
              </p>
            </div>
            <FileText className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Influencers</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(overview?.totalInfluencers || 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {overview?.platformStats?.map((platform: any) => (
          <div
            key={platform.platformId}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            {/* Platform Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getPlatformColor(platform.platformType)}`}>
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {platform.platformName}
                    </h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {platform.platformType}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Active
                </span>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-600">Posts</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCompactNumber(platform.totalPosts)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Influencers</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumber(platform.totalInfluencers)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Likes</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCompactNumber(platform.totalLikes)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Comments</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCompactNumber(platform.totalComments)}
                  </p>
                </div>
              </div>

              {/* Engagement & Sentiment */}
              <div className="space-y-4">
                {/* Avg Engagement */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Avg Engagement Score</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {platform.avgEngagementScore.toFixed(2)}
                  </span>
                </div>

                {/* Sentiment Distribution */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Sentiment Distribution</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <p className="text-xs text-green-900">Positive</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatNumber(platform.sentimentDistribution.positive)}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-900">Neutral</p>
                      <p className="text-lg font-bold text-gray-600">
                        {formatNumber(platform.sentimentDistribution.neutral)}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <p className="text-xs text-red-900">Negative</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatNumber(platform.sentimentDistribution.negative)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
