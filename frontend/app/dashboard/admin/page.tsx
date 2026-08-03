'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Activity,
  Database,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          System monitoring and health status
        </p>
      </div>

      {/* System Monitoring */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-orange-500" />
          System Monitoring
        </h2>
        <p className="text-sm text-gray-600">
          No monitoring data available. System metrics, uptime, and resource usage
          will appear here once the monitoring API is available.
        </p>
      </div>

      {/* Database Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2 text-green-500" />
          Database Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Posts</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatNumber(overview?.totalPosts || 0)}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Influencers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatNumber(overview?.totalInfluencers || 0)}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Active Platforms</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatNumber(
                platforms?.filter((platform: any) => platform.isActive).length ||
                  0,
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Worker Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Server className="w-5 h-5 mr-2 text-blue-500" />
          Worker Status
        </h2>
        <p className="text-sm text-gray-600">
          No worker status available yet. Worker activity will appear here once
          workers start reporting their status.
        </p>
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

      {/* System Information */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-yellow-900">System Information</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Content appears here as workers collect real data. All content tables
              start empty after a fresh setup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
