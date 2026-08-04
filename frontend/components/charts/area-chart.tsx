'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/contexts/theme-context';
import { getChartTheme, getChartTooltipStyle } from './chart-theme';

interface EngagementAreaChartProps {
  data: Array<{
    date: string;
    value: number;
  }>;
  title?: string;
  color?: string;
  label?: string;
}

export function EngagementAreaChart({
  data,
  title,
  color = '#3b82f6',
  label = 'Engagement',
}: EngagementAreaChartProps) {
  const { theme } = useTheme();
  const chartTheme = getChartTheme(theme);

  return (
    <div className="w-full">
      {title && <h3 className="mb-4 text-lg font-semibold text-card-foreground">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
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
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fillOpacity={1}
            fill="url(#colorValue)"
            name={label}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
