// PDF Report Generation Service
// Note: Requires 'jspdf' and 'jspdf-autotable' packages
// Install with: npm install jspdf jspdf-autotable
//
// All user-visible strings come from the i18n dictionaries so PDF
// reports follow the currently selected language (English / Bahasa Indonesia).

import { formatNumber, formatDateTime } from '@/lib/format';
import { getDictionary } from '@/lib/i18n';

const d = () => getDictionary();

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
      doc.text(`Festival Mbois - ${d()['pdf.reportDashboard']}`, 14, 20);
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text(`${d()['pdf.generated']}: ${formatDateTime(new Date())}`, 14, 28);
      
      // Summary Stats
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text(d()['pdf.overviewStatistics'], 14, 40);
      
      const summaryData = [
        [d()['pdf.totalPosts'], formatNumber(overview?.totalPosts || 0)],
        [d()['export.totalInfluencers'], formatNumber(overview?.totalInfluencers || 0)],
        [d()['dashboard.activePlatforms'], String(overview?.totalPlatforms || 0)],
        [d()['export.avgEngagementScore'], overview?.avgEngagementScore?.toFixed(2) || '0'],
        [d()['dashboard.totalEngagement'], formatNumber(overview?.totalEngagement || 0)],
      ];
      
      doc.autoTable({
        startY: 45,
        head: [[d()['pdf.metric'], d()['pdf.value']]],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }, // blue-500
      });
      
      // Sentiment Distribution
      let yPos = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text(d()['pdf.sentimentDistribution'], 14, yPos);
      
      const sentimentData = [
        [d()['common.positive'], formatNumber(overview?.sentimentDistribution?.positive || 0)],
        [d()['common.neutral'], formatNumber(overview?.sentimentDistribution?.neutral || 0)],
        [d()['common.negative'], formatNumber(overview?.sentimentDistribution?.negative || 0)],
      ];
      
      doc.autoTable({
        startY: yPos + 5,
        head: [[d()['pdf.sentiment'], d()['pdf.count']]],
        body: sentimentData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      // Recent Activity
      yPos = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text(d()['pdf.recentActivity'], 14, yPos);
      
      const activityData = [
        [d()['dashboard.last24Hours'], formatNumber(overview?.recentActivity?.last24Hours || 0)],
        [d()['dashboard.last7Days'], formatNumber(overview?.recentActivity?.last7Days || 0)],
        [d()['dashboard.last30Days'], formatNumber(overview?.recentActivity?.last30Days || 0)],
      ];
      
      doc.autoTable({
        startY: yPos + 5,
        head: [[d()['pdf.period'], d()['pdf.posts']]],
        body: activityData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      // Top Platform
      if (overview?.topPlatform) {
        yPos = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text(d()['pdf.topPlatform'], 14, yPos);
        doc.setFontSize(12);
        doc.setTextColor(107, 114, 128);
        doc.text(`${overview.topPlatform.name} - ${formatNumber(overview.topPlatform.postsCount)} ${d()['common.posts']}`, 14, yPos + 7);
      }
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // gray-400
        doc.text(
          d()['pdf.pageOf'].replace('{page}', String(i)).replace('{totalPages}', String(pageCount)),
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
      doc.text(`Festival Mbois - ${d()['pdf.reportPosts']}`, 14, 20);
      
      // Date & Filters
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`${d()['pdf.generated']}: ${formatDateTime(new Date())}`, 14, 28);
      
      if (filters) {
        const parts: string[] = [];
        if (filters.platform) parts.push(`${d()['export.platform']}: ${filters.platform}`);
        if (filters.sentiment) parts.push(`${d()['export.sentiment']}: ${filters.sentiment}`);
        if (parts.length > 0) {
          doc.text(`${d()['pdf.filtersLabel']}: ${parts.join(', ')}`, 14, 34);
        }
      }
      
      // Summary
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text(`${d()['pdf.totalPosts']}: ${posts.length}`, 14, 45);
      
      // Posts Table
      const tableData = posts.slice(0, 50).map(post => [
        post.platformName || d()['common.nA'],
        post.influencerName || d()['pdf.unknown'],
        (post.content || '').substring(0, 50) + '...',
        post.sentiment || d()['common.nA'],
        formatNumber(post.likesCount || 0),
        formatNumber(post.commentsCount || 0),
        post.engagementScore?.toFixed(1) || '0',
      ]);
      
      doc.autoTable({
        startY: 50,
        head: [[d()['export.platform'], d()['export.author'], d()['export.content'], d()['export.sentiment'], d()['pdf.likes'], d()['pdf.comments'], d()['pdf.score']]],
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
        doc.text(
          `${d()['pdf.note']}: ${d()['pdf.showingFirst'].replace('{count}', '50').replace('{total}', String(posts.length))}`,
          14,
          yPos
        );
      }
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          d()['pdf.pageOf'].replace('{page}', String(i)).replace('{totalPages}', String(pageCount)),
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
      doc.text(`Festival Mbois - ${d()['pdf.reportAnalytics']}`, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`${d()['pdf.generated']}: ${formatDateTime(new Date())}`, 14, 28);
      
      // Sentiment Analytics
      if (analytics.sentiment) {
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55);
        doc.text(d()['pdf.sentimentAnalysis'], 14, 40);
        
        const sentimentData = [
          [d()['common.positive'], formatNumber(analytics.sentiment.overall?.positive || 0)],
          [d()['common.neutral'], formatNumber(analytics.sentiment.overall?.neutral || 0)],
          [d()['common.negative'], formatNumber(analytics.sentiment.overall?.negative || 0)],
        ];
        
        doc.autoTable({
          startY: 45,
          head: [[d()['pdf.sentiment'], d()['pdf.count']]],
          body: sentimentData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
      }
      
      // Engagement Analytics
      if (analytics.engagement) {
        const yPos = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text(d()['pdf.engagementMetrics'], 14, yPos);
        
        const engagementData = [
          [d()['export.totalLikes'], formatNumber(analytics.engagement.totalLikes || 0)],
          [d()['export.totalComments'], formatNumber(analytics.engagement.totalComments || 0)],
          [d()['export.totalShares'], formatNumber(analytics.engagement.totalShares || 0)],
          [d()['export.totalViews'], formatNumber(analytics.engagement.totalViews || 0)],
          [d()['export.avgLikesPerPost'], analytics.engagement.avgLikesPerPost?.toFixed(2) || '0'],
          [d()['export.avgCommentsPerPost'], analytics.engagement.avgCommentsPerPost?.toFixed(2) || '0'],
          [d()['export.avgSharesPerPost'], analytics.engagement.avgSharesPerPost?.toFixed(2) || '0'],
        ];
        
        doc.autoTable({
          startY: yPos + 5,
          head: [[d()['pdf.metric'], d()['pdf.value']]],
          body: engagementData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
      }
      
      // Top Hashtags
      if (analytics.hashtags && analytics.hashtags.length > 0) {
        const yPos = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text(d()['pdf.topHashtags'], 14, yPos);
        
        const hashtagData = analytics.hashtags.slice(0, 20).map((item: any, idx: number) => [
          String(idx + 1),
          item.hashtag,
          formatNumber(item.count),
        ]);
        
        doc.autoTable({
          startY: yPos + 5,
          head: [[d()['export.rank'], d()['export.hashtag'], d()['export.count']]],
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
          d()['pdf.pageOf'].replace('{page}', String(i)).replace('{totalPages}', String(pageCount)),
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
