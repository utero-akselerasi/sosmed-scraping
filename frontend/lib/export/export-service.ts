// Export utilities for CSV and Excel downloads

export interface ExportColumn {
  key: string;
  header: string;
  format?: (value: any) => string;
}

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
      { key: 'id', header: 'ID' },
      { key: 'platformName', header: 'Platform' },
      { key: 'content', header: 'Content' },
      { key: 'influencerName', header: 'Author' },
      { key: 'influencerUsername', header: 'Username' },
      { key: 'sentiment', header: 'Sentiment' },
      { key: 'likesCount', header: 'Likes' },
      { key: 'commentsCount', header: 'Comments' },
      { key: 'sharesCount', header: 'Shares' },
      { key: 'viewsCount', header: 'Views' },
      { key: 'engagementScore', header: 'Engagement Score', format: (v) => v?.toFixed(2) || '0' },
      { key: 'postedAt', header: 'Published At', format: (v) => new Date(v).toLocaleString() },
      { key: 'hashtags', header: 'Hashtags', format: (v) => Array.isArray(v) ? v.join(', ') : '' },
    ];

    const filename = `posts_export_${new Date().toISOString().split('T')[0]}`;
    this.downloadCSV(posts, columns, filename);
  }

  /**
   * Export influencers to CSV
   */
  static exportInfluencers(influencers: any[]) {
    const columns: ExportColumn[] = [
      { key: 'id', header: 'ID' },
      { key: 'fullName', header: 'Name' },
      { key: 'username', header: 'Username' },
      { key: 'platformName', header: 'Platform' },
      { key: 'followersCount', header: 'Followers' },
      { key: 'postsCount', header: 'Total Posts' },
      { key: 'totalLikes', header: 'Total Likes' },
      { key: 'totalComments', header: 'Total Comments' },
      { key: 'totalShares', header: 'Total Shares' },
      { key: 'avgEngagementRate', header: 'Avg Engagement Rate', format: (v) => v?.toFixed(2) + '%' || '0%' },
      { key: 'isVerified', header: 'Verified', format: (v) => v ? 'Yes' : 'No' },
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
          { key: 'platformName', header: 'Platform' },
          { key: 'positive', header: 'Positive' },
          { key: 'neutral', header: 'Neutral' },
          { key: 'negative', header: 'Negative' },
          { 
            key: 'total', 
            header: 'Total',
            format: (v) => String((data.positive || 0) + (data.neutral || 0) + (data.negative || 0))
          },
        ];
        break;

      case 'engagement':
        filename = `engagement_analytics_${new Date().toISOString().split('T')[0]}`;
        csvData = [data]; // Single row summary
        columns = [
          { key: 'totalLikes', header: 'Total Likes' },
          { key: 'totalComments', header: 'Total Comments' },
          { key: 'totalShares', header: 'Total Shares' },
          { key: 'totalViews', header: 'Total Views' },
          { key: 'avgLikesPerPost', header: 'Avg Likes/Post', format: (v) => v?.toFixed(2) || '0' },
          { key: 'avgCommentsPerPost', header: 'Avg Comments/Post', format: (v) => v?.toFixed(2) || '0' },
          { key: 'avgSharesPerPost', header: 'Avg Shares/Post', format: (v) => v?.toFixed(2) || '0' },
          { key: 'avgEngagementPerPost', header: 'Avg Engagement/Post', format: (v) => v?.toFixed(2) || '0' },
        ];
        break;

      case 'hashtags':
        filename = `hashtags_analytics_${new Date().toISOString().split('T')[0]}`;
        csvData = data || [];
        columns = [
          { key: 'hashtag', header: 'Hashtag' },
          { key: 'count', header: 'Count' },
          { key: 'rank', header: 'Rank' },
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
      topPlatform: overview?.topPlatform?.name || 'N/A',
      topPlatformPosts: overview?.topPlatform?.postsCount || 0,
    }];

    const columns: ExportColumn[] = [
      { key: 'totalPosts', header: 'Total Posts' },
      { key: 'totalInfluencers', header: 'Total Influencers' },
      { key: 'totalPlatforms', header: 'Total Platforms' },
      { key: 'avgEngagementScore', header: 'Avg Engagement Score' },
      { key: 'positiveCount', header: 'Positive Sentiment' },
      { key: 'neutralCount', header: 'Neutral Sentiment' },
      { key: 'negativeCount', header: 'Negative Sentiment' },
      { key: 'last24Hours', header: 'Posts (24h)' },
      { key: 'last7Days', header: 'Posts (7d)' },
      { key: 'last30Days', header: 'Posts (30d)' },
      { key: 'topPlatform', header: 'Top Platform' },
      { key: 'topPlatformPosts', header: 'Top Platform Posts' },
    ];

    const filename = `dashboard_overview_${new Date().toISOString().split('T')[0]}`;
    this.downloadCSV(data, columns, filename);
  }
}


