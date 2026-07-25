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

  const { data: influencer, isLoading } = useQuery({
    queryKey: ['influencer', influencerId],
    queryFn: () => apiClient.getInfluencer(influencerId),
  });

  const mockEngagementData = [
    { date: 'Week 1', likes: 1200, comments: 340, shares: 180 },
    { date: 'Week 2', likes: 1800, comments: 420, shares: 250 },
    { date: 'Week 3', likes: 2100, comments: 580, shares: 310 },
    { date: 'Week 4', likes: 1600, comments: 390, shares: 220 },
  ];

  const mockContentTypeData = [
    { name: 'Photos', value: 45 },
    { name: 'Videos', value: 35 },
    { name: 'Reels', value: 15 },
    { name: 'Stories', value: 5 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Influencer Profile</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {influencer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{influencer.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">@{influencer.username}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Followers</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCompactNumber(influencer.followersCount)}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <BarChart3 className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Posts</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(influencer.postsCount)}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Engagement</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{influencer.engagementRate?.toFixed(2)}%</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Heart className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Engagement</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCompactNumber(influencer.avgEngagement)}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Engagement Over Time</h3>
          <EngagementAreaChart data={mockEngagementData} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Types</h3>
          <CustomPieChart data={mockContentTypeData} colors={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']} />
        </div>
      </div>
    </div>
  );
}