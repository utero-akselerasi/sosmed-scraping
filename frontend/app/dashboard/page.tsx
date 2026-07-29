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
import { TrendChart } from '@/components/charts/trend-chart';
import { CustomPieChart } from '@/components/charts/pie-chart';
import { ExportButton } from '@/components/export-button';
import { ExportService } from '@/lib/export/export-service';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { AutoRefreshToggle } from '@/components/auto-refresh-toggle';

export default function DashboardPage() {
  // Auto-refresh hook
  const autoRefresh = useAutoRefresh({
    interval: 30,
    enabled: false,
    queryKeys: ['dashboard-overview', 'platforms', 'trends'],
  });

  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => apiClient.getDashboardOverview(),
  });

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiClient.getPlatforms(),
  });

  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: () => apiClient.getTrends(),
  });

  const handleExport = () => {
    if (overview) {
      ExportService.exportDashboard(overview);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
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

  // Prepare sentiment pie data
  const sentimentPieData = [
    { name: 'Positive', value: sentimentData?.positive || 0 },
    { name: 'Neutral', value: sentimentData?.neutral || 0 },
    { name: 'Negative', value: sentimentData?.negative || 0 },
  ];

  // Format trend data for charts
  const dailyTrendData = trends?.dailyPosts?.slice(-7).map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count,
    engagement: item.engagement,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Social media analytics for Festival Mbois
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AutoRefreshToggle
            isEnabled={autoRefresh.isEnabled}
            countdown={autoRefresh.countdown}
            onToggle={autoRefresh.toggle}
            interval={30}
          />
          <ExportButton 
            onExport={handleExport}
            label="Export Dashboard"
            disabled={!overview}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white" title={stat.detail}>
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <TrendChart 
            data={dailyTrendData}
            title="Posts Trend (Last 7 Days)"
          />
        </div>

        {/* Sentiment Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <CustomPieChart
            data={sentimentPieData}
            title="Sentiment Distribution"
            colors={['#10b981', '#6b7280', '#ef4444']}
          />
        </div>
      </div>

      {/* Sentiment Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sentiment Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800 dark:text-green-300">Positive</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {sentimentData?.positive || 0}
              </span>
            </div>
            <p className="mt-2 text-xs text-green-600 dark:text-green-400">
              {formatPercentage((sentimentData?.positive || 0) / ((sentimentData?.positive || 0) + (sentimentData?.neutral || 0) + (sentimentData?.negative || 0)))}
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-300">Neutral</span>
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {sentimentData?.neutral || 0}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              {formatPercentage((sentimentData?.neutral || 0) / ((sentimentData?.positive || 0) + (sentimentData?.neutral || 0) + (sentimentData?.negative || 0)))}
            </p>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-800 dark:text-red-300">Negative</span>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {sentimentData?.negative || 0}
              </span>
            </div>
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {formatPercentage((sentimentData?.negative || 0) / ((sentimentData?.positive || 0) + (sentimentData?.neutral || 0) + (sentimentData?.negative || 0)))}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Last 24 Hours</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(overview?.recentActivity?.last24Hours || 0)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Last 7 Days</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatNumber(overview?.recentActivity?.last7Days || 0)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Last 30 Days</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatNumber(overview?.recentActivity?.last30Days || 0)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Top Platform */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <ThumbsUp className="w-5 h-5 text-gray-600 dark:text-gray-400 mb-2" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Engagement</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCompactNumber(overview?.totalEngagement || 0)}
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400 mb-2" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Platforms</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {platforms?.length || 0} Active
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Engagement Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <ThumbsUp className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Likes</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">-</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Comments</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">-</p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Share2 className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Shares</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">-</p>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Eye className="w-6 h-6 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Views</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">-</p>
          </div>
        </div>
      </div>
    </div>
  );
}
