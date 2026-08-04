'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTheme } from '@/contexts/theme-context';
import { getChartTheme, getChartTooltipStyle } from './chart-theme';

interface PieChartData {
  name: string;
  value: number;
}

interface CustomPieChartProps {
  data: PieChartData[];
  title?: string;
  colors?: string[];
}

const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6b7280'];

export function CustomPieChart({ data, title, colors = DEFAULT_COLORS }: CustomPieChartProps) {
  const { theme } = useTheme();
  const chartTheme = getChartTheme(theme);

  return (
    <div className="w-full">
      {title && <h3 className="mb-4 text-lg font-semibold text-card-foreground">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={getChartTooltipStyle(theme)}
            labelStyle={{ color: chartTheme.label }}
            itemStyle={{ color: chartTheme.tooltipText }}
          />
          <Legend wrapperStyle={{ color: chartTheme.axis, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
