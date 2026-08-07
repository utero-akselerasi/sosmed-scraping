'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/contexts/theme-context';
import { getChartTheme, getChartTooltipStyle } from './chart-theme';
import { useI18n } from '@/lib/i18n';

interface TrendChartProps {
  data: Array<{
    date: string;
    count: number;
    engagement?: number;
  }>;
  title?: string;
}

export function TrendChart({ data, title }: TrendChartProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const chartTheme = getChartTheme(theme);

  return (
    <div className="w-full">
      {title && <h3 className="mb-4 text-lg font-semibold text-card-foreground">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis
            dataKey="date"
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
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name={t('charts.posts')}
          />
          {data[0]?.engagement !== undefined && (
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 4 }}
              activeDot={{ r: 6 }}
              name={t('charts.engagement')}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
