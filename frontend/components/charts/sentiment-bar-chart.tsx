'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
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
          <Legend />
          <Bar 
            dataKey="positive" 
            fill="#10b981" 
            name="Positive"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="neutral" 
            fill="#6b7280" 
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
