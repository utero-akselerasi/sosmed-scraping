'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/contexts/theme-context';
import { getChartTheme, getChartTooltipStyle } from './chart-theme';

interface SentimentBarChartProps {
  data: Array<{
    name: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
  title?: string;
}

export function SentimentBarChart({ data, title }: SentimentBarChartProps) {
  const { theme } = useTheme();
  const chartTheme = getChartTheme(theme);

  return (
    <div className="w-full">
      {title && <h3 className="mb-4 text-lg font-semibold text-card-foreground">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis
            dataKey="name"
            stroke={chartTheme.axis}
            tick={{ fill: chartTheme.axis, fontSize: 12 }}
          />
          <YAxis
            stroke={chartTheme.axis}
            tick={{ fill: chartTheme.axis, fontSize: 12 }}
          />
          <Tooltip
            contentStyle={getChartTooltipStyle(theme)}
            labelStyle={{ color: chartTheme.label }}
            itemStyle={{ color: chartTheme.tooltipText }}
          />
          <Legend wrapperStyle={{ color: chartTheme.axis, fontSize: 12 }} />
          <Bar
            dataKey="positive"
            fill="#10b981"
            name="Positive"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="neutral"
            fill="#94a3b8"
            name="Neutral"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="negative"
            fill="#ef4444"
            name="Negative"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
