'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '@/contexts/theme-context';
import { getChartTheme, getChartTooltipStyle } from './chart-theme';
import { useI18n } from '@/lib/i18n';

interface EngagementAreaChartProps {
  data: Array<{
    date: string;
    likes?: number;
    comments?: number;
    shares?: number;
    value?: number;
  }>;
  title?: string;
}

export function EngagementAreaChart({
  data,
  title,
}: EngagementAreaChartProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const chartTheme = getChartTheme(theme);

  const hasMultiSeries = data.length > 0 && 'likes' in data[0];

  return (
    <div className="w-full">
      {title && <h3 className="mb-4 text-lg font-semibold text-card-foreground">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
            </linearGradient>
          </defs>
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
          <Legend />
          {hasMultiSeries ? (
            <>
              <Area
                type="monotone"
                dataKey="likes"
                stackId="1"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorLikes)"
                name={t('common.likes')}
              />
              <Area
                type="monotone"
                dataKey="comments"
                stackId="1"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorComments)"
                name={t('common.comments')}
              />
              <Area
                type="monotone"
                dataKey="shares"
                stackId="1"
                stroke="#a855f7"
                fillOpacity={1}
                fill="url(#colorShares)"
                name={t('common.shares')}
              />
            </>
          ) : (
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorLikes)"
              name={t('charts.engagement')}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
