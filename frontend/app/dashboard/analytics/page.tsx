'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatPercentage } from '@/lib/format';
import { TrendingUp, BarChart3, Hash, Heart } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: sentiment } = useQuery({
    queryKey: ['sentiment-analytics'],
    queryFn: () => apiClient.getSentimentAnalytics(),
  });

  const { data: engagement } = useQuery({
    queryKey: ['engagement-analytics'],
    queryFn: () => apiClient.getEngagementAnalytics(),
  });

  const { data: topHashtags } = useQuery({
    queryKey: ['analytics-hashtags'],
    queryFn: () => apiClient.getTopHashtags(20),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Deep insights and trends analysis
        </p>
      </div>

      {/* Sentiment Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Overall Sentiment Distribution
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-green-50 rounded-lg">
            <div className="text-4xl mb-2">😊</div>
            <p className="text-sm text-green-900 font-medium">Positive</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {formatNumber(sentiment?.overall?.positive || 0)}
            </p>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <div className="text-4xl mb-2">😐</div>
            <p className="text-sm text-gray-900 font-medium">Neutral</p>
            <p className="text-3xl font-bold text-gray-600 mt-2">
              {formatNumber(sentiment?.overall?.neutral || 0)}
            </p>
          </div>
          <div className="text-center p-6 bg-red-50 rounded-lg">
            <div className="text-4xl mb-2">😞</div>
            <p className="text-sm text-red-900 font-medium">Negative</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {formatNumber(sentiment?.overall?.negative || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Sentiment by Platform */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Sentiment by Platform
        </h2>
        <div className="space-y-4">
          {sentiment?.byPlatform?.map((platform) => (
            <div key={platform.platformName} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">{platform.platformName}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Positive</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatNumber(platform.positive)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Neutral</p>
                  <p className="text-lg font-bold text-gray-600">
                    {formatNumber(platform.neutral)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Negative</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatNumber(platform.negative)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Heart className="w-5 h-5 mr-2 text-red-500" />
          Engagement Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Likes</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(engagement?.totalLikes || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Avg: {engagement?.avgLikesPerPost?.toFixed(1) || 0} per post
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Comments</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(engagement?.totalComments || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Avg: {engagement?.avgCommentsPerPost?.toFixed(1) || 0} per post
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Shares</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(engagement?.totalShares || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Avg: {engagement?.avgSharesPerPost?.toFixed(1) || 0} per post
            </p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Views</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(engagement?.totalViews || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Top Hashtags */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Hash className="w-5 h-5 mr-2 text-blue-500" />
          Top Trending Hashtags
        </h2>
        <div className="flex flex-wrap gap-3">
          {topHashtags?.slice(0, 20).map((item, idx) => (
            <div
              key={idx}
              className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-200"
            >
              <span className="text-sm font-medium text-blue-900">{item.hashtag}</span>
              <span className="ml-2 text-xs text-blue-600">
                ({formatNumber(item.count)})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Engaging Posts */}
      {engagement?.topEngagingPosts && engagement.topEngagingPosts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
            Top Engaging Posts
          </h2>
          <div className="space-y-3">
            {engagement.topEngagingPosts.slice(0, 5).map((post, idx) => (
              <div key={post.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        {post.platform}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{post.content}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-lg font-bold text-green-600">
                      {post.engagementScore.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">engagement</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
