// Export utilities for CSV and Excel downloads
// All user-visible headers come from the i18n dictionaries so exports
// follow the currently selected language (English / Bahasa Indonesia).

import { getDictionary, getLanguage } from '@/lib/i18n';

export interface ExportColumn {
  key: string;
  header: string;
  format?: (value: any) => string;
}

const d = () => getDictionary();
const intlLocale = () => (getLanguage() === 'id' ? 'id-ID' : 'en-US');

export class ExportService {
  /**
   * Convert data to CSV format
   */
  static toCSV(data: any[], columns: ExportColumn[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // Create header row
    const headers = columns.map(col => col.header);
    const csvRows = [headers.join(',')];

    // Create data rows
    data.forEach(row => {
      const values = columns.map(col => {
        let value = row[col.key];
        
        // Apply custom formatter if provided
        if (col.format && value !== undefined && value !== null) {
          value = col.format(value);
        }

        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }

        // Escape quotes and wrap in quotes if contains comma or newline
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Download CSV file
   */
  static downloadCSV(data: any[], columns: ExportColumn[], filename: string) {
    const csv = this.toCSV(data, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${filename}.csv`);
  }

  /**
   * Download JSON file
   */
  static downloadJSON(data: any[], filename: string) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, `${filename}.json`);
  }

  /**
   * Helper to trigger download
   */
  private static downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export posts to CSV
   */
  static exportPosts(posts: any[]) {
    const columns: ExportColumn[] = [
      { key: 'id', header: d()['export.id'] },
      { key: 'platformName', header: d()['export.platform'] },
      { key: 'content', header: d()['export.content'] },
      { key: 'influencerName', header: d()['export.author'] },
      { key: 'influencerUsername', header: d()['export.username'] },
      { key: 'sentiment', header: d()['export.sentiment'] },
      { key: 'likesCount', header: d()['common.likes'] },
      { key: 'commentsCount', header: d()['common.comments'] },
      { key: 'sharesCount', header: d()['common.shares'] },
      { key: 'viewsCount', header: d()['common.views'] },
      { key: 'engagementScore', header: d()['export.engagementScore'], format: (v) => v?.toFixed(2) || '0' },
      { key: 'postedAt', header: d()['export.publishedAt'], format: (v) => new Date(v).toLocaleString(intlLocale()) },
      { key: 'hashtags', header: d()['export.hashtags'], format: (v) => Array.isArray(v) ? v.join(', ') : '' },
    ];

    const filename = `posts_export_${new Date().toISOString().split('T')[0]}`;
    this.downloadCSV(posts, columns, filename);
  }

  /**
   * Export influencers to CSV
   */
  static exportInfluencers(influencers: any[]) {
    const columns: ExportColumn[] = [
      { key: 'id', header: d()['export.id'] },
      { key: 'fullName', header: d()['export.name'] },
      { key: 'username', header: d()['export.username'] },
      { key: 'platformName', header: d()['export.platform'] },
      { key: 'followersCount', header: d()['common.followers'] },
      { key: 'postsCount', header: d()['export.totalPosts'] },
      { key: 'totalLikes', header: d()['export.totalLikes'] },
      { key: 'totalComments', header: d()['export.totalComments'] },
      { key: 'totalShares', header: d()['export.totalShares'] },
      { key: 'avgEngagementRate', header: d()['export.avgEngagementRate'], format: (v) => v?.toFixed(2) + '%' || '0%' },
      { key: 'isVerified', header: d()['common.verified'], format: (v) => v ? d()['common.yes'] : d()['common.no'] },
    ];

    const filename = `influencers_export_${new Date().toISOString().split('T')[0]}`;
    this.downloadCSV(influencers, columns, filename);
  }

  /**
   * Export analytics to CSV
   */
  static exportAnalytics(data: any, type: 'sentiment' | 'engagement' | 'hashtags') {
    let filename = '';
    let csvData: any[] = [];
    let columns: ExportColumn[] = [];

    switch (type) {
      case 'sentiment':
        filename = `sentiment_analytics_${new Date().toISOString().split('T')[0]}`;
        csvData = data.byPlatform || [];
        columns = [
          { key: 'platformName', header: d()['export.platform'] },
          { key: 'positive', header: d()['common.positive'] },
          { key: 'neutral', header: d()['common.neutral'] },
          { key: 'negative', header: d()['common.negative'] },
          { 
            key: 'total', 
            header: d()['export.total'],
            format: (v) => String((data.positive || 0) + (data.neutral || 0) + (data.negative || 0))
          },
        ];
        break;

      case 'engagement':
        filename = `engagement_analytics_${new Date().toISOString().split('T')[0]}`;
        csvData = [data]; // Single row summary
        columns = [
          { key: 'totalLikes', header: d()['export.totalLikes'] },
          { key: 'totalComments', header: d()['export.totalComments'] },
          { key: 'totalShares', header: d()['export.totalShares'] },
          { key: 'totalViews', header: d()['export.totalViews'] },
          { key: 'avgLikesPerPost', header: d()['export.avgLikesPerPost'], format: (v) => v?.toFixed(2) || '0' },
          { key: 'avgCommentsPerPost', header: d()['export.avgCommentsPerPost'], format: (v) => v?.toFixed(2) || '0' },
          { key: 'avgSharesPerPost', header: d()['export.avgSharesPerPost'], format: (v) => v?.toFixed(2) || '0' },
          { key: 'avgEngagementPerPost', header: d()['export.avgEngagementPerPost'], format: (v) => v?.toFixed(2) || '0' },
        ];
        break;

      case 'hashtags':
        filename = `hashtags_analytics_${new Date().toISOString().split('T')[0]}`;
        csvData = data || [];
        columns = [
          { key: 'hashtag', header: d()['export.hashtag'] },
          { key: 'count', header: d()['export.count'] },
          { key: 'rank', header: d()['export.rank'] },
        ];
        break;
    }

    this.downloadCSV(csvData, columns, filename);
  }

  /**
   * Export dashboard overview to CSV
   */
  static exportDashboard(overview: any) {
    const data = [{
      totalPosts: overview?.totalPosts || 0,
      totalInfluencers: overview?.totalInfluencers || 0,
      totalPlatforms: overview?.totalPlatforms || 0,
      avgEngagementScore: overview?.avgEngagementScore?.toFixed(2) || '0',
      positiveCount: overview?.sentimentDistribution?.positive || 0,
      neutralCount: overview?.sentimentDistribution?.neutral || 0,
      negativeCount: overview?.sentimentDistribution?.negative || 0,
      last24Hours: overview?.recentActivity?.last24Hours || 0,
      last7Days: overview?.recentActivity?.last7Days || 0,
      last30Days: overview?.recentActivity?.last30Days || 0,
      topPlatform: overview?.topPlatform?.name || d()['common.nA'],
      topPlatformPosts: overview?.topPlatform?.postsCount || 0,
    }];

    const columns: ExportColumn[] = [
      { key: 'totalPosts', header: d()['export.totalPosts'] },
      { key: 'totalInfluencers', header: d()['export.totalInfluencers'] },
      { key: 'totalPlatforms', header: d()['export.totalPlatforms'] },
      { key: 'avgEngagementScore', header: d()['export.avgEngagementScore'] },
      { key: 'positiveCount', header: d()['export.positiveSentiment'] },
      { key: 'neutralCount', header: d()['export.neutralSentiment'] },
      { key: 'negativeCount', header: d()['export.negativeSentiment'] },
      { key: 'last24Hours', header: d()['export.posts24h'] },
      { key: 'last7Days', header: d()['export.posts7d'] },
      { key: 'last30Days', header: d()['export.posts30d'] },
      { key: 'topPlatform', header: d()['export.topPlatform'] },
      { key: 'topPlatformPosts', header: d()['export.topPlatformPosts'] },
    ];

    const filename = `dashboard_overview_${new Date().toISOString().split('T')[0]}`;
    this.downloadCSV(data, columns, filename);
  }
}
