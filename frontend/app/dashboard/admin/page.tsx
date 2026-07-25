'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { 
  Activity, 
  Database, 
  Server, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
  Zap
} from 'lucide-react';
import { formatNumber } from '@/lib/format';

export default function AdminPage() {
  const { data: overview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => apiClient.getDashboardOverview(),
  });

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiClient.getPlatforms(),
  });

  // Mock system metrics (in real app, these would come from backend)
  const systemMetrics = {
    apiResponseTime: '125ms',
    databaseConnections: 12,
    maxDatabaseConnections: 100,
    cacheHitRate: 94.5,
    uptime: '5d 12h 34m',
    lastBackup: '2 hours ago',
    diskUsage: 45.2,
    memoryUsage: 62.8,
    cpuUsage: 34.5,
  };

  const workerStatus = [
    { name: 'Instagram Worker', status: 'active', lastRun: '5 minutes ago', postsCollected: 245 },
    { name: 'TikTok Worker', status: 'active', lastRun: '3 minutes ago', postsCollected: 189 },
    { name: 'Website Scraper', status: 'idle', lastRun: '1 hour ago', postsCollected: 45 },
    { name: 'Sentiment Analyzer', status: 'active', lastRun: 'Just now', processed: 1250 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          System monitoring and health status
        </p>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">System Status</p>
              <p className="text-2xl font-bold text-green-600 mt-2">Healthy</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{systemMetrics.uptime}</p>
            </div>
            <Clock className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">API Response</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{systemMetrics.apiResponseTime}</p>
            </div>
            <Zap className="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{systemMetrics.cacheHitRate}%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Server className="w-5 h-5 mr-2 text-blue-500" />
          Resource Usage
        </h2>
        <div className="space-y-4">
          {/* CPU Usage */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">CPU Usage</span>
              <span className="font-medium text-gray-900">{systemMetrics.cpuUsage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${systemMetrics.cpuUsage}%` }}
              ></div>
            </div>
          </div>

          {/* Memory Usage */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Memory Usage</span>
              <span className="font-medium text-gray-900">{systemMetrics.memoryUsage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${systemMetrics.memoryUsage}%` }}
              ></div>
            </div>
          </div>

          {/* Disk Usage */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Disk Usage</span>
              <span className="font-medium text-gray-900">{systemMetrics.diskUsage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${systemMetrics.diskUsage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Database Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2 text-green-500" />
          Database Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Active Connections</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {systemMetrics.databaseConnections} / {systemMetrics.maxDatabaseConnections}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Last Backup</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{systemMetrics.lastBackup}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Records</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatNumber(overview?.totalPosts || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Worker Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-orange-500" />
          Worker Status
        </h2>
        <div className="space-y-3">
          {workerStatus.map((worker, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  worker.status === 'active' ? 'bg-green-500 animate-pulse' : 
                  worker.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">{worker.name}</p>
                  <p className="text-sm text-gray-500">Last run: {worker.lastRun}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {worker.postsCollected ? `${formatNumber(worker.postsCollected)} posts` : 
                   worker.processed ? `${formatNumber(worker.processed)} processed` : 'N/A'}
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  worker.status === 'active' ? 'bg-green-100 text-green-800' : 
                  worker.status === 'idle' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {worker.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Platform Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms?.map((platform: any) => (
            <div key={platform.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900">{platform.name}</p>
                {platform.isActive ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <p className="text-sm text-gray-600">Status: {platform.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <FileText className="w-8 h-8 mb-2 opacity-80" />
          <p className="text-sm opacity-90">Total Posts</p>
          <p className="text-3xl font-bold mt-1">{formatNumber(overview?.totalPosts || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
          <Users className="w-8 h-8 mb-2 opacity-80" />
          <p className="text-sm opacity-90">Total Influencers</p>
          <p className="text-3xl font-bold mt-1">{formatNumber(overview?.totalInfluencers || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
          <p className="text-sm opacity-90">Avg Engagement</p>
          <p className="text-3xl font-bold mt-1">{overview?.avgEngagementScore?.toFixed(1) || '0'}</p>
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-yellow-900">System Information</h3>
            <p className="text-sm text-yellow-700 mt-1">
              All systems operational. No critical alerts at this time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
