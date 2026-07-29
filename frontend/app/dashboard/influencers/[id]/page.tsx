'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatCompactNumber } from '@/lib/format';
import { 
  ArrowLeft,
  Users, 
  TrendingUp, 
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Calendar,
  MapPin,
  Link as LinkIcon,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { CustomPieChart } from '@/components/charts/pie-chart';
import { EngagementAreaChart } from '@/components/charts/area-chart';

export default function InfluencerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const influencerId = params.id as string;

  const { data: influencer, isLoading: isLoadingInfluencer } = useQuery({
    queryKey: ['influencer', influencerId],
    queryFn: () => apiClient.getInfluencerById(influencerId),
  });

  const { data: engagementData, isLoading: isLoadingEngagement } = useQuery({
    queryKey: ['influencer-engagement', influencerId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/influencers/${influencerId}/engagement?days=30`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch engagement data');
      return response.json();
    },
    enabled: !!influencerId,
  });

  const { data: contentTypeData, isLoading: isLoadingContentTypes } = useQuery({
    queryKey: ['influencer-content-types', influencerId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/influencers/${influencerId}/content-types`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch content types');
      return response.json();
    },
    enabled: !!influencerId,
  });

  if (isLoadingInfluencer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading influencer...</p>
        </div>
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Influencer not found</p>
      </div>
    );
  }

  // Transform engagement data for chart
  const chartEngagementData = engagementData?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    likes: item.likes,
    comments: item.comments,
    shares: item.shares,
  })) || [];

  // Transform content type data for pie chart
  const chartContentTypeData = contentTypeData?.map((item: any) => ({
    name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
    value: item.count,
  })) || [];

  const pieColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Influencer Profile</h1>
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {influencer.profilePictureUrl ? (
              <img 
                src={influencer.profilePictureUrl} 
                alt={influencer.fullName}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {influencer.fullName?.charAt(0).toUpperCase() || influencer.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {influencer.fullName || influencer.username}
                </h2>
                {influencer.isVerified && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">@{influencer.username}</p>
              <span className="inline-block mt-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                {influencer.platformName}
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {influencer.bio && (
          <p className="text-gray-700 dark:text-gray-300 mb-6">{influencer.bio}</p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Followers</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCompactNumber(influencer.followersCount)}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <BarChart3 className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Posts</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatNumber(influencer.totalPosts || influencer.postsCount)}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Engagement Rate</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {influencer.engagementRate?.toFixed(2)}%
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Heart className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Engagement</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCompactNumber(influencer.avgEngagementScore || 0)}
            </p>
          </div>
        </div>

        {/* Additional Stats */}
        {influencer.totalLikes !== undefined && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Heart className="w-5 h-5 text-red-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Likes</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCompactNumber(influencer.totalLikes)}
              </p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <MessageCircle className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Comments</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCompactNumber(influencer.totalComments)}
              </p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Share2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Shares</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCompactNumber(influencer.totalShares)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sentiment Distribution */}
      {influencer.sentimentDistribution && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sentiment Analysis</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-900 dark:text-green-300">Positive</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {influencer.sentimentDistribution.positive}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-900 dark:text-gray-300">Neutral</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {influencer.sentimentDistribution.neutral}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-900 dark:text-red-300">Negative</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {influencer.sentimentDistribution.negative}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Over Time */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Engagement Over Time (Last 30 Days)
          </h3>
          {isLoadingEngagement ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : chartEngagementData.length > 0 ? (
            <EngagementAreaChart data={chartEngagementData} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No engagement data available
            </div>
          )}
        </div>

        {/* Content Types */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Type Distribution</h3>
          {isLoadingContentTypes ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : chartContentTypeData.length > 0 ? (
            <CustomPieChart data={chartContentTypeData} colors={pieColors} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No content type data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
