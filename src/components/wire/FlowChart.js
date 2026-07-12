'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

export default function FlowChart({ data }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="chart-loading-placeholder">Loading chart...</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty-state">
        <span className="empty-icon">📊</span>
        <p>No ETF net flow data available for this period.</p>
      </div>
    );
  }

  // Format date and sanitize net flows safely
  const formattedData = (data || [])
    .filter(item => item && (item.date || item.published_at))
    .map(item => {
      const rawDate = item.date || item.published_at;
      let displayDate = 'N/A';
      try {
        const dateObj = new Date(rawDate);
        if (!isNaN(dateObj.getTime())) {
          displayDate = dateObj.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            timeZone: 'UTC' 
          });
        } else {
          displayDate = String(rawDate);
        }
      } catch (e) {
        displayDate = String(rawDate);
      }

      let flow = 0;
      if (item.net_flow !== undefined && item.net_flow !== null) {
        const parsed = parseFloat(item.net_flow);
        if (!isNaN(parsed)) {
          flow = parsed;
        }
      }

      return {
        ...item,
        displayDate,
        flow
      };
    });

  if (formattedData.length === 0) {
    return (
      <div className="chart-empty-state">
        <span className="empty-icon">📊</span>
        <p>No valid ETF net flow data available.</p>
      </div>
    );
  }

  return (
    <div className="flow-chart-wrapper">
      <div className="chart-subtitle">Daily Net Inflows/Outflows ($ Millions)</div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={formattedData}
          margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis 
            dataKey="displayDate" 
            stroke="var(--text-secondary)" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="var(--text-secondary)" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}M`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value) => [`$${value.toFixed(1)}M`, 'Net Flow']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1} />
          <Bar dataKey="flow">
            {formattedData.map((entry, index) => {
              const isPositive = entry.flow >= 0;
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={isPositive ? 'var(--accent-green)' : 'var(--accent-red)'}
                  fillOpacity={0.85}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
