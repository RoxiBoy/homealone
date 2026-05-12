import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import StatCard from '../components/StatCard';
import TrendChart from '../components/TrendChart';

export default function DashboardPage() {
  const { token } = useAdminAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiRequest('/admin/stats', { token }),
  });

  if (isLoading) {
    return <div className="screen-shell">Loading admin dashboard...</div>;
  }

  if (error) {
    return <div className="error-banner">{error.message}</div>;
  }

  const subscriptionData = [
    { label: 'Free', value: data.subscriptionBreakdown.free },
    { label: 'Monthly', value: data.subscriptionBreakdown.monthly },
    { label: 'Yearly', value: data.subscriptionBreakdown.yearly },
  ];

  return (
    <div className="page-stack">
      <div className="stats-grid">
        <StatCard label="Active users" value={data.activeUsers} detail="Seen in the last 30 days" tone="green" />
        <StatCard label="Total users" value={data.totalUsers} detail="All non-admin accounts" tone="blue" />
        <StatCard label="Paid users" value={data.paidUsers} detail="Monthly and yearly plans" tone="orange" />
      </div>

      <div className="stats-grid">
        <StatCard
          label="Avg alarms per user per month"
          value={data.globalAverages.alarmsPerUserPerMonth}
          detail="Average across users with session history"
          tone="slate"
        />
        <StatCard
          label="Avg emergencies per user per month"
          value={data.globalAverages.emergenciesPerUserPerMonth}
          detail="Timeout and manual emergencies combined"
          tone="slate"
        />
        <StatCard
          label="Average OK rate"
          value={`${Math.round((data.globalAverages.avgOkRate || 0) * 100)}%`}
          detail="Successful check-in responses"
          tone="slate"
        />
      </div>

      <div className="panel-grid">
        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Subscriptions</p>
              <h3>Plan breakdown</h3>
            </div>
          </div>
          <TrendChart data={subscriptionData} mode="bar" />
        </section>

        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Emergency activity</p>
              <h3>Recent alerts</h3>
            </div>
          </div>
          <div className="list-stack">
            {data.recentAlerts?.length ? (
              data.recentAlerts.map(alert => (
                <article key={alert.id} className="list-row">
                  <div>
                    <strong>{alert.user?.name || alert.user?.username || 'Unknown user'}</strong>
                    <p>
                      Contacted {alert.contact?.name || 'Unknown contact'} via {alert.channels.join(', ')}
                    </p>
                  </div>
                  <span>{new Date(alert.createdAt).toLocaleString()}</span>
                </article>
              ))
            ) : (
              <div className="empty-state">No emergency alerts have been logged yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
