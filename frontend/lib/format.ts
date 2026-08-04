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
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
    case 'negative':
      return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300';
    case 'neutral':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Get platform icon/color
 */
export function getPlatformColor(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300';
    case 'tiktok':
      return 'bg-muted text-card-foreground';
    case 'facebook':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300';
    case 'twitter':
    case 'x':
      return 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300';
    case 'threads':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300';
    case 'website':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
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
