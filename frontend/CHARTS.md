# Charts & Visualizations Documentation

## 📊 Overview

This project includes 4 reusable chart components built with **Recharts** library, providing beautiful and interactive data visualizations for the Festival Mbois Intelligence Platform.

---

## 🎨 Chart Components

### 1. **TrendChart** (Line Chart)
**File:** `frontend/components/charts/trend-chart.tsx`

**Purpose:** Display trends over time (posts, engagement, metrics)

**Features:**
- Dual line chart (2 metrics)
- Interactive tooltips
- Gradient fills
- Responsive design
- Custom colors

**Usage:**
```tsx
import { TrendChart } from '@/components/charts/trend-chart';

const data = [
  { date: 'Jul 18', posts: 45, engagement: 1250 },
  { date: 'Jul 19', posts: 52, engagement: 1580 },
  { date: 'Jul 20', posts: 38, engagement: 920 },
];

<TrendChart 
  data={data}
  title="Posts & Engagement Trend"
  dataKey1="posts"
  dataKey2="engagement"
  label1="Posts"
  label2="Engagement"
/>
```

**Props:**
- `data`: Array of data points
- `title`: Chart title (optional)
- `dataKey1`: First metric key (default: 'count')
- `dataKey2`: Second metric key (default: 'engagement')
- `label1`: First metric label (default: 'Count')
- `label2`: Second metric label (default: 'Engagement')

---

### 2. **CustomPieChart** (Pie Chart)
**File:** `frontend/components/charts/pie-chart.tsx`

**Purpose:** Display distribution data (sentiment, categories)

**Features:**
- Color-coded segments
- Percentage labels
- Interactive tooltips
- Legend
- Custom colors support

**Usage:**
```tsx
import { CustomPieChart } from '@/components/charts/pie-chart';

const data = [
  { name: 'Positive', value: 150 },
  { name: 'Neutral', value: 80 },
  { name: 'Negative', value: 25 },
];

<CustomPieChart
  data={data}
  title="Sentiment Distribution"
  colors={['#10b981', '#6b7280', '#ef4444']}
/>
```

**Props:**
- `data`: Array with `name` and `value` properties
- `title`: Chart title (optional)
- `colors`: Array of hex colors (optional)

**Default Colors:**
- Green (#10b981) - Positive
- Gray (#6b7280) - Neutral
- Red (#ef4444) - Negative

---

### 3. **SentimentBarChart** (Bar Chart)
**File:** `frontend/components/charts/sentiment-bar-chart.tsx`

**Purpose:** Compare sentiment across platforms/categories

**Features:**
- Stacked/grouped bars
- Color-coded by sentiment
- Interactive tooltips
- Legend
- Platform comparison

**Usage:**
```tsx
import { SentimentBarChart } from '@/components/charts/sentiment-bar-chart';

const data = [
  { platform: 'Instagram', positive: 120, neutral: 45, negative: 15 },
  { platform: 'TikTok', positive: 95, neutral: 30, negative: 8 },
  { platform: 'Twitter', positive: 67, neutral: 22, negative: 12 },
];

<SentimentBarChart 
  data={data}
  title="Sentiment by Platform"
/>
```

**Props:**
- `data`: Array with platform and sentiment counts
- `title`: Chart title (optional)

**Colors:**
- Positive: Green (#10b981)
- Neutral: Gray (#6b7280)
- Negative: Red (#ef4444)

---

### 4. **EngagementAreaChart** (Area Chart)
**File:** `frontend/components/charts/area-chart.tsx`

**Purpose:** Show engagement metrics over time

**Features:**
- Multiple stacked areas
- Gradient fills
- Interactive tooltips
- Legend
- Time series data

**Usage:**
```tsx
import { EngagementAreaChart } from '@/components/charts/engagement-area-chart';

const data = [
  { date: 'Jul 18', likes: 850, comments: 125, shares: 45 },
  { date: 'Jul 19', likes: 920, comments: 156, shares: 62 },
  { date: 'Jul 20', likes: 780, comments: 98, shares: 38 },
];

<EngagementAreaChart
  data={data}
  title="Engagement Metrics Over Time"
/>
```

**Props:**
- `data`: Array with date and engagement metrics
- `title`: Chart title (optional)

**Metrics:**
- Likes (Blue #3b82f6)
- Comments (Green #10b981)
- Shares (Purple #8b5cf6)

---

## 🎯 Common Features

All chart components share these features:

### **Responsive Design**
- Auto-resize based on container
- Mobile-friendly
- Touch-enabled on mobile devices

### **Interactive Tooltips**
- Hover to see detailed values
- Formatted numbers (K, M notation)
- Multi-metric display

### **Professional Styling**
- Clean, modern design
- Tailwind CSS integration
- Consistent color scheme
- Beautiful gradients

### **Performance**
- Optimized rendering
- Lazy loading ready
- Efficient re-renders

---

## 📦 Installation

Charts are already included in the project. If you need to add Recharts to a new project:

```bash
npm install recharts
# or
yarn add recharts
```

---

## 🎨 Color Scheme

### **Sentiment Colors**
```tsx
const SENTIMENT_COLORS = {
  positive: '#10b981',  // Green
  neutral: '#6b7280',   // Gray
  negative: '#ef4444',  // Red
};
```

### **Platform Colors**
```tsx
const PLATFORM_COLORS = {
  instagram: '#E1306C',
  tiktok: '#000000',
  twitter: '#1DA1F2',
  youtube: '#FF0000',
  facebook: '#4267B2',
};
```

### **Engagement Colors**
```tsx
const ENGAGEMENT_COLORS = {
  likes: '#3b82f6',    // Blue
  comments: '#10b981', // Green
  shares: '#8b5cf6',   // Purple
  views: '#f59e0b',    // Orange
};
```

---

## 🔧 Customization

### **Custom Colors**
```tsx
// Override default colors
<CustomPieChart
  data={data}
  colors={['#ff6b6b', '#4ecdc4', '#45b7d1']}
/>
```

### **Custom Formatting**
All charts use the formatting utilities from `@/lib/format`:

```tsx
import { formatNumber, formatCompactNumber } from '@/lib/format';

formatNumber(1250);        // "1,250"
formatCompactNumber(1250); // "1.3K"
```

### **Custom Size**
Charts automatically fill their container:

```tsx
<div className="h-64 w-full">
  <TrendChart data={data} />
</div>

<div className="h-96 w-full">
  <CustomPieChart data={data} />
</div>
```

---

## 📊 Usage Examples

### **Dashboard Page**
```tsx
// Display 7-day trend
const dailyTrendData = trends?.dailyPosts?.slice(-7).map((item) => ({
  date: new Date(item.date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  }),
  count: item.count,
  engagement: item.engagement,
}));

<TrendChart 
  data={dailyTrendData}
  title="Posts Trend (Last 7 Days)"
/>
```

### **Analytics Page**
```tsx
// Multiple charts
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Pie Chart */}
  <CustomPieChart
    data={sentimentPieData}
    title="Overall Sentiment Distribution"
    colors={['#10b981', '#6b7280', '#ef4444']}
  />

  {/* Line Chart */}
  <TrendChart 
    data={dailyTrendData}
    title="Posts & Engagement Trend"
  />

  {/* Bar Chart */}
  <SentimentBarChart 
    data={platformSentimentData}
    title="Sentiment by Platform"
  />

  {/* Area Chart */}
  <EngagementAreaChart
    data={engagementData}
    title="Engagement Over Time"
  />
</div>
```

---

## 🚀 Performance Tips

1. **Limit Data Points**
   - Display last 7-30 days for trends
   - Aggregate older data
   - Use pagination for large datasets

2. **Memoization**
   ```tsx
   const chartData = useMemo(() => 
     prepareChartData(rawData), 
     [rawData]
   );
   ```

3. **Lazy Loading**
   ```tsx
   const TrendChart = dynamic(
     () => import('@/components/charts/trend-chart'),
     { ssr: false }
   );
   ```

---

## 🐛 Troubleshooting

### **Chart Not Displaying**
- Verify data format matches expected structure
- Check container has height/width
- Ensure Recharts is installed

### **Tooltip Not Working**
- Check data keys match tooltip configuration
- Verify data values are numbers, not strings

### **Responsive Issues**
- Wrap chart in container with defined dimensions
- Use percentage-based heights in parent

---

## 📚 Resources

- **Recharts Docs:** https://recharts.org/
- **Examples:** https://recharts.org/en-US/examples
- **API Reference:** https://recharts.org/en-US/api

---

## ✅ Checklist

Current implementation status:

- ✅ TrendChart (Line) - Complete
- ✅ CustomPieChart (Pie) - Complete
- ✅ SentimentBarChart (Bar) - Complete
- ✅ EngagementAreaChart (Area) - Complete
- ✅ Responsive design
- ✅ Interactive tooltips
- ✅ Color coding
- ✅ Legends
- ✅ Formatting utilities
- ✅ TypeScript types
- ✅ Documentation

---

**Created:** 25 Juli 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
