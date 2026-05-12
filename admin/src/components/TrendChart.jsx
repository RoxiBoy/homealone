import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function TrendChart({ data, mode = 'line' }) {
  if (!data?.length) {
    return <div className="empty-state">No trend data yet.</div>;
  }

  const normalized = data.map(item => ({
    ...item,
    label: item.label || `${item.year}-${String(item.month).padStart(2, '0')}`,
  }));

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={300}>
        {mode === 'bar' ? (
          <BarChart data={normalized}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#2f6df6" radius={[8, 8, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={normalized}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="totalAlarms" stroke="#2f6df6" strokeWidth={3} />
            <Line type="monotone" dataKey="totalEmergencies" stroke="#f97316" strokeWidth={3} />
            <Line type="monotone" dataKey="okResponses" stroke="#0f9f6e" strokeWidth={3} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
