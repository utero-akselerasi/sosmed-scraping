import { format, formatDistanceToNow } from 'date-fns';

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format number to compact notation (1K, 1M, etc)
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

/**
 * Format percentage
 */
export function formatPercentage(num: number, decimals: number = 1): string {
  return `${num.toFixed(decimals)}%`;
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string, formatStr: string = 'dd MMM yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format datetime
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd MMM yyyy, HH:mm');
}

/**
 * Get sentiment color
 */
export function getSentimentColor(sentiment: string): string {
  switch (sentiment.toLowerCase()) {
    case 'positive':
      return 'text-green-600 bg-green-100';
    case 'negative':
      return 'text-red-600 bg-red-100';
    case 'neutral':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Get platform icon/color
 */
export function getPlatformColor(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return 'text-pink-600 bg-pink-100';
    case 'tiktok':
      return 'text-black bg-gray-100';
    case 'facebook':
      return 'text-blue-600 bg-blue-100';
    case 'twitter':
    case 'x':
      return 'text-sky-600 bg-sky-100';
    case 'threads':
      return 'text-purple-600 bg-purple-100';
    case 'website':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Truncate text
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Calculate engagement rate
 */
export function calculateEngagementRate(
  likes: number,
  comments: number,
  shares: number,
  followers: number
): number {
  if (followers === 0) return 0;
  const totalEngagement = likes + comments + shares;
  return (totalEngagement / followers) * 100;
}

/**
 * Get growth indicator
 */
export function getGrowthIndicator(current: number, previous: number): {
  percentage: number;
  isPositive: boolean;
  isNegative: boolean;
} {
  if (previous === 0) {
    return { percentage: 0, isPositive: false, isNegative: false };
  }
  
  const percentage = ((current - previous) / previous) * 100;
  return {
    percentage: Math.abs(percentage),
    isPositive: percentage > 0,
    isNegative: percentage < 0,
  };
}
