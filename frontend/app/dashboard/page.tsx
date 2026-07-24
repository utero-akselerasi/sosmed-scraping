'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatCompactNumber, formatPercentage } from '@/lib/format';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Globe,
  ThumbsUp,
  MessageCircle,
  Share2,
  Eye
} from 'lucide-react';

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => apiClient.getDashboardOverview(),
  });

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiClient.getPlatforms(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Posts',
      value: formatCompactNumber(overview?.totalPosts || 0),
      icon: FileText,
      color: 'bg-blue-500',
      detail: formatNumber(overview?.totalPosts || 0),
    },
    {
      name: 'Total Influencers',
      value: formatNumber(overview?.totalInfluencers || 0),
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      name: 'Active Platforms',
      value: overview?.totalPlatforms || 0,
      icon: Globe,
      color: 'bg-green-500',
    },
    {
      name: 'Avg Engagement',
      value: formatCompactNumber(overview?.avgEngagementScore || 0),
      icon: TrendingUp,
      color: 'bg-orange-500',
      detail: overview?.avgEngagementScore?.toFixed(2) || '0',
    },
  ];

  const sentimentData = overview?.sentimentDistribution;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-gray-600">
          Social media analytics for Festival Mbois
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900" title={stat.detail}>
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sentiment Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Sentiment Distribution
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">Positive</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(sentimentData?.positive || 0)}
                </p>
                <p className="text-xs text-green-700">
                  {formatPercentage(sentimentData?.positivePercentage || 0)}
                </p>
              </div>
              <div className="text-green-500">😊</div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Neutral</p>
                <p className="text-2xl font-bold text-gray-600">
                  {formatNumber(sentimentData?.neutral || 0)}
                </p>
                <p className="text-xs text-gray-700">
                  {formatPercentage(sentimentData?.neutralPercentage || 0)}
                </p>
              </div>
              <div className="text-gray-500">😐</div>
            </div>
          </div>

          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-900">Negative</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatNumber(sentimentData?.negative || 0)}
                </p>
                <p className="text-xs text-red-700">
                  {formatPercentage(sentimentData?.negativePercentage || 0)}
                </p>
              </div>
              <div className="text-red-500">😞</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Last 24 Hours</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(overview?.recentActivity?.last24Hours || 0)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Last 7 Days</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(overview?.recentActivity?.last7Days || 0)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Last 30 Days</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(overview?.recentActivity?.last30Days || 0)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Top Platform */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Platform Stats
          </h2>
          <div className="space-y-3">
            <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg text-white">
              <p className="text-sm font-medium opacity-90">Top Platform</p>
              <p className="text-2xl font-bold mt-1">
                {overview?.topPlatform?.name || 'N/A'}
              </p>
              <p className="text-sm opacity-90 mt-1">
                {formatNumber(overview?.topPlatform?.postsCount || 0)} posts
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <ThumbsUp className="w-5 h-5 text-gray-600 mb-2" />
                <p className="text-xs text-gray-600">Total Engagement</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCompactNumber(overview?.totalEngagement || 0)}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <Globe className="w-5 h-5 text-gray-600 mb-2" />
                <p className="text-xs text-gray-600">Platforms</p>
                <p className="text-lg font-bold text-gray-900">
                  {platforms?.length || 0} Active
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Engagement Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <ThumbsUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Likes</p>
            <p className="text-xl font-bold text-gray-900">-</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <MessageCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Comments</p>
            <p className="text-xl font-bold text-gray-900">-</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Share2 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Shares</p>
            <p className="text-xl font-bold text-gray-900">-</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <Eye className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Views</p>
            <p className="text-xl font-bold text-gray-900">-</p>
          </div>
        </div>
      </div>
    </div>
  );
}
