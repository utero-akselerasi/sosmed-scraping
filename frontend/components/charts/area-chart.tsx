'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  label = 'Engagement'
}: EngagementAreaChartProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
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
