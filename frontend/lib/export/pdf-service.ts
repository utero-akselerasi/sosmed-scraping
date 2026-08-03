// PDF Report Generation Service
// Note: Requires 'jspdf' and 'jspdf-autotable' packages
// Install with: npm install jspdf jspdf-autotable

import { formatNumber, formatDate } from '@/lib/format';

export class PDFReportService {
  /**
   * Generate Dashboard Overview Report
   */
  static async generateDashboardReport(overview: any) {
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');

      const doc = new jsPDF() as any;
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55); // gray-800
      doc.text('Festival Mbois - Dashboard Report', 14, 20);
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      
      // Summary Stats
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('Overview Statistics', 14, 40);
      
      const summaryData = [
        ['Total Posts', formatNumber(overview?.totalPosts || 0)],
        ['Total Influencers', formatNumber(overview?.totalInfluencers || 0)],
        ['Active Platforms', String(overview?.totalPlatforms || 0)],
        ['Avg Engagement Score', overview?.avgEngagementScore?.toFixed(2) || '0'],
        ['Total Engagement', formatNumber(overview?.totalEngagement || 0)],
      ];
      
      doc.autoTable({
        startY: 45,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }, // blue-500
      });
      
      // Sentiment Distribution
      let yPos = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('Sentiment Distribution', 14, yPos);
      
      const sentimentData = [
        ['Positive', formatNumber(overview?.sentimentDistribution?.positive || 0)],
        ['Neutral', formatNumber(overview?.sentimentDistribution?.neutral || 0)],
        ['Negative', formatNumber(overview?.sentimentDistribution?.negative || 0)],
      ];
      
      doc.autoTable({
        startY: yPos + 5,
        head: [['Sentiment', 'Count']],
        body: sentimentData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      // Recent Activity
      yPos = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('Recent Activity', 14, yPos);
      
      const activityData = [
        ['Last 24 Hours', formatNumber(overview?.recentActivity?.last24Hours || 0)],
        ['Last 7 Days', formatNumber(overview?.recentActivity?.last7Days || 0)],
        ['Last 30 Days', formatNumber(overview?.recentActivity?.last30Days || 0)],
      ];
      
      doc.autoTable({
        startY: yPos + 5,
        head: [['Period', 'Posts']],
        body: activityData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      // Top Platform
      if (overview?.topPlatform) {
        yPos = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text('Top Platform', 14, yPos);
        doc.setFontSize(12);
        doc.setTextColor(107, 114, 128);
        doc.text(`${overview.topPlatform.name} - ${formatNumber(overview.topPlatform.postsCount)} posts`, 14, yPos + 7);
      }
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // gray-400
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
      
      // Save
      doc.save(`dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`);
      return true;
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate Posts Report
   */
  static async generatePostsReport(posts: any[], filters?: any) {
    try {
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');

      const doc = new jsPDF() as any;
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55);
      doc.text('Festival Mbois - Posts Report', 14, 20);
      
      // Date & Filters
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      
      if (filters) {
        let filterText = 'Filters: ';
        if (filters.platform) filterText += `Platform: ${filters.platform}, `;
        if (filters.sentiment) filterText += `Sentiment: ${filters.sentiment}, `;
        if (filterText !== 'Filters: ') {
          doc.text(filterText, 14, 34);
        }
      }
      
      // Summary
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text(`Total Posts: ${posts.length}`, 14, 45);
      
      // Posts Table
      const tableData = posts.slice(0, 50).map(post => [
        post.platformName || 'N/A',
        post.influencerName || 'Unknown',
        (post.content || '').substring(0, 50) + '...',
        post.sentiment || 'N/A',
        formatNumber(post.likesCount || 0),
        formatNumber(post.commentsCount || 0),
        post.engagementScore?.toFixed(1) || '0',
      ]);
      
      doc.autoTable({
        startY: 50,
        head: [['Platform', 'Author', 'Content', 'Sentiment', 'Likes', 'Comments', 'Score']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          2: { cellWidth: 50 }, // Content column wider
        },
      });
      
      if (posts.length > 50) {
        const yPos = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text(`Note: Showing first 50 of ${posts.length} posts`, 14, yPos);
      }
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
      
      doc.save(`posts-report-${new Date().toISOString().split('T')[0]}.pdf`);
      return true;
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate Analytics Report
   */
  static async generateAnalyticsReport(analytics: any) {
    try {
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');

      const doc = new jsPDF() as any;
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55);
      doc.text('Festival Mbois - Analytics Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      
      // Sentiment Analytics
      if (analytics.sentiment) {
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55);
        doc.text('Sentiment Analysis', 14, 40);
        
        const sentimentData = [
          ['Positive', formatNumber(analytics.sentiment.overall?.positive || 0)],
          ['Neutral', formatNumber(analytics.sentiment.overall?.neutral || 0)],
          ['Negative', formatNumber(analytics.sentiment.overall?.negative || 0)],
        ];
        
        doc.autoTable({
          startY: 45,
          head: [['Sentiment', 'Count']],
          body: sentimentData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
      }
      
      // Engagement Analytics
      if (analytics.engagement) {
        const yPos = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text('Engagement Metrics', 14, yPos);
        
        const engagementData = [
          ['Total Likes', formatNumber(analytics.engagement.totalLikes || 0)],
          ['Total Comments', formatNumber(analytics.engagement.totalComments || 0)],
          ['Total Shares', formatNumber(analytics.engagement.totalShares || 0)],
          ['Total Views', formatNumber(analytics.engagement.totalViews || 0)],
          ['Avg Likes/Post', analytics.engagement.avgLikesPerPost?.toFixed(2) || '0'],
          ['Avg Comments/Post', analytics.engagement.avgCommentsPerPost?.toFixed(2) || '0'],
          ['Avg Shares/Post', analytics.engagement.avgSharesPerPost?.toFixed(2) || '0'],
        ];
        
        doc.autoTable({
          startY: yPos + 5,
          head: [['Metric', 'Value']],
          body: engagementData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
      }
      
      // Top Hashtags
      if (analytics.hashtags && analytics.hashtags.length > 0) {
        const yPos = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text('Top Hashtags', 14, yPos);
        
        const hashtagData = analytics.hashtags.slice(0, 20).map((item: any, idx: number) => [
          String(idx + 1),
          item.hashtag,
          formatNumber(item.count),
        ]);
        
        doc.autoTable({
          startY: yPos + 5,
          head: [['Rank', 'Hashtag', 'Count']],
          body: hashtagData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
      }
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
      
      doc.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
      return true;
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  }
}
