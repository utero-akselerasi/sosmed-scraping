'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatPercentage, formatCompactNumber } from '@/lib/format';
import { TrendingUp, BarChart3, Hash, Heart, Activity, PieChart } from 'lucide-react';
import { SentimentBarChart } from '@/components/charts/sentiment-bar-chart';
import { CustomPieChart } from '@/components/charts/pie-chart';
import { TrendChart } from '@/components/charts/trend-chart';
import { EngagementAreaChart } from '@/components/charts/area-chart';

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

  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: () => apiClient.getTrends(),
  });

  // Prepare sentiment pie data
  const sentimentPieData = [
    { name: 'Positive', value: sentiment?.overall?.positive || 0 },
    { name: 'Neutral', value: sentiment?.overall?.neutral || 0 },
    { name: 'Negative', value: sentiment?.overall?.negative || 0 },
  ];

  // Prepare sentiment by platform data for bar chart
  const platformSentimentData = sentiment?.byPlatform?.map((platform: any) => ({
    platform: platform.platformName,
    positive: platform.positive,
    neutral: platform.neutral,
    negative: platform.negative,
  })) || [];

  // Format trend data for charts
  const dailyTrendData = trends?.dailyPosts?.slice(-14).map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count,
    engagement: item.engagement,
  })) || [];

  // Prepare engagement over time data
  const engagementOverTimeData = trends?.dailyPosts?.slice(-14).map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    likes: Math.floor(Math.random() * 1000), // Mock data - replace with real
    comments: Math.floor(Math.random() * 200),
    shares: Math.floor(Math.random() * 100),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Deep insights and trends analysis for Festival Mbois
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Positive Rate</p>
              <p className="text-3xl font-bold mt-2">
                {formatPercentage((sentiment?.overall?.positive || 0) / ((sentiment?.overall?.positive || 0) + (sentiment?.overall?.neutral || 0) + (sentiment?.overall?.negative || 0)))}
              </p>
            </div>
            <Activity className="w-10 h-10 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Engagement</p>
              <p className="text-3xl font-bold mt-2">
                {formatCompactNumber((engagement?.totalLikes || 0) + (engagement?.totalComments || 0) + (engagement?.totalShares || 0))}
              </p>
            </div>
            <Heart className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Avg Engagement</p>
              <p className="text-3xl font-bold mt-2">
                {engagement?.avgEngagementPerPost?.toFixed(1) || '0'}
              </p>
            </div>
            <BarChart3 className="w-10 h-10 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Top Hashtags</p>
              <p className="text-3xl font-bold mt-2">
                {topHashtags?.length || 0}
              </p>
            </div>
            <Hash className="w-10 h-10 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution Pie */}
        <div className="bg-white rounded-lg shadow p-6">
          <CustomPieChart
            data={sentimentPieData}
            title="Overall Sentiment Distribution"
            colors={['#10b981', '#6b7280', '#ef4444']}
          />
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(sentiment?.overall?.positive || 0)}
              </p>
              <p className="text-xs text-green-900 mt-1">Positive</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">
                {formatNumber(sentiment?.overall?.neutral || 0)}
              </p>
              <p className="text-xs text-gray-900 mt-1">Neutral</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {formatNumber(sentiment?.overall?.negative || 0)}
              </p>
              <p className="text-xs text-red-900 mt-1">Negative</p>
            </div>
          </div>
        </div>

        {/* Posts Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <TrendChart data={dailyTrendData} title="Posts & Engagement Trend (14 Days)" />
        </div>
      </div>

      {/* Sentiment by Platform Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <SentimentBarChart 
          data={platformSentimentData}
          title="Sentiment Analysis by Platform"
        />
      </div>

      {/* Engagement Area Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <EngagementAreaChart
          data={engagementOverTimeData}
          title="Engagement Metrics Over Time (14 Days)"
        />
      </div>

      {/* Engagement Stats Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Heart className="w-5 h-5 mr-2 text-red-500" />
          Engagement Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg border border-red-100">
            <p className="text-sm text-gray-600 font-medium">Total Likes</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {formatCompactNumber(engagement?.totalLikes || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Avg: {engagement?.avgLikesPerPost?.toFixed(1) || 0} per post
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
            <p className="text-sm text-gray-600 font-medium">Total Comments</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {formatCompactNumber(engagement?.totalComments || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Avg: {engagement?.avgCommentsPerPost?.toFixed(1) || 0} per post
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
            <p className="text-sm text-gray-600 font-medium">Total Shares</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {formatCompactNumber(engagement?.totalShares || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Avg: {engagement?.avgSharesPerPost?.toFixed(1) || 0} per post
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border border-orange-100">
            <p className="text-sm text-gray-600 font-medium">Total Views</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {formatCompactNumber(engagement?.totalViews || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Across all platforms
            </p>
          </div>
        </div>
      </div>

      {/* Top Hashtags Cloud */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Hash className="w-5 h-5 mr-2 text-blue-500" />
          Top Trending Hashtags
        </h2>
        <div className="flex flex-wrap gap-3">
          {topHashtags?.slice(0, 30).map((item: any, idx: number) => {
            const size = Math.max(12, Math.min(20, 12 + (item.count / 10)));
            const opacity = Math.max(0.5, Math.min(1, item.count / 50));
            return (
              <div
                key={idx}
                className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-200 hover:shadow-md transition-all cursor-pointer"
                style={{ fontSize: `${size}px`, opacity }}
              >
                <span className="font-medium text-blue-900">{item.hashtag}</span>
                <span className="ml-2 text-xs text-blue-600 font-bold">
                  {formatNumber(item.count)}
                </span>
              </div>
            );
          })}
        </div>
        {!topHashtags || topHashtags.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No hashtags data available yet
          </p>
        )}
      </div>

      {/* Top Engaging Posts */}
      {engagement?.topEngagingPosts && engagement.topEngagingPosts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
            Top Engaging Posts
          </h2>
          <div className="space-y-3">
            {engagement.topEngagingPosts.slice(0, 5).map((post: any, idx: number) => (
              <div key={post.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                        {idx + 1}
                      </span>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                        {post.platform}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        post.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                        post.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {post.sentiment || 'neutral'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>?? {formatCompactNumber(post.likesCount || 0)}</span>
                      <span>?? {formatCompactNumber(post.commentsCount || 0)}</span>
                      <span>?? {formatCompactNumber(post.sharesCount || 0)}</span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-2xl font-bold text-green-600">
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

      {/* Sentiment by Platform Detail */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <PieChart className="w-5 h-5 mr-2 text-indigo-500" />
          Detailed Sentiment by Platform
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sentiment?.byPlatform?.map((platform: any) => {
            const total = platform.positive + platform.neutral + platform.negative;
            const positivePercent = total > 0 ? (platform.positive / total) * 100 : 0;
            const neutralPercent = total > 0 ? (platform.neutral / total) * 100 : 0;
            const negativePercent = total > 0 ? (platform.negative / total) * 100 : 0;

            return (
              <div key={platform.platformName} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">{platform.platformName}</h3>
                
                {/* Progress bars */}
                <div className="space-y-2 mb-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-700">Positive</span>
                      <span className="text-green-700 font-bold">{positivePercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${positivePercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700">Neutral</span>
                      <span className="text-gray-700 font-bold">{neutralPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-500 h-2 rounded-full transition-all"
                        style={{ width: `${neutralPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-red-700">Negative</span>
                      <span className="text-red-700 font-bold">{negativePercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${negativePercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Counts */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">
                      {formatNumber(platform.positive)}
                    </p>
                    <p className="text-xs text-gray-600">Positive</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-600">
                      {formatNumber(platform.neutral)}
                    </p>
                    <p className="text-xs text-gray-600">Neutral</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-600">
                      {formatNumber(platform.negative)}
                    </p>
                    <p className="text-xs text-gray-600">Negative</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {(!sentiment?.byPlatform || sentiment.byPlatform.length === 0) && (
          <p className="text-center text-gray-500 py-8">
            No platform sentiment data available yet
          </p>
        )}
      </div>
    </div>
  );
}

