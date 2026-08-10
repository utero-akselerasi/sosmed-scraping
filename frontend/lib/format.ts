import { format, formatDistanceToNow, type Locale } from 'date-fns';
import { enUS, id as idLocale } from 'date-fns/locale';
import { getLanguage, translate } from '@/lib/i18n';

/**
 * Locale code used by Intl APIs for the active app language.
 */
export function getIntlLocale(): string {
  return getLanguage() === 'id' ? 'id-ID' : 'en-US';
}

/**
 * date-fns locale for the active app language.
 */
export function getDateFnsLocale(): Locale {
  return getLanguage() === 'id' ? idLocale : enUS;
}

/**
 * Format number with thousands separator (locale-aware)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat(getIntlLocale()).format(num);
}

/**
 * Format number to compact notation (1K, 1M, etc) - locale-aware
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat(getIntlLocale(), {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

/**
 * Format percentage (locale-aware decimal separator)
 */
export function formatPercentage(num: number, decimals: number = 1): string {
  return `${new Intl.NumberFormat(getIntlLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)}%`;
}

/**
 * Format a date with Intl.DateTimeFormat for the active app language
 */
export function formatLocaleDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(getIntlLocale(), options).format(dateObj);
}

/**
 * Format date to readable string (locale-aware)
 */
export function formatDate(date: Date | string, formatStr: string = 'dd MMM yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: getDateFnsLocale() });
}

/**
 * Format date to relative time (e.g., "2 hours ago" / "2 jam yang lalu")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: getDateFnsLocale() });
}

/**
 * Format datetime (locale-aware)
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd MMM yyyy, HH:mm', { locale: getDateFnsLocale() });
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
 * Get localized platform display label.
 * X/Twitter uses the i18n label ('platforms.x'); other platforms fall back
 * to the database name (e.g. "Instagram", "Facebook") so nothing else changes.
 */
export function getPlatformLabel(
  platformType?: string | null,
  fallbackName?: string | null
): string {
  if (platformType) {
    switch (platformType.toLowerCase()) {
      case 'twitter':
      case 'x':
        return translate('platforms.x');
    }
  }
  return fallbackName || platformType || '';
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
