import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import TrendChart from '../components/TrendChart';
import SubscriptionBadge from '../components/SubscriptionBadge';
import { useAdminAuth } from '../context/AdminAuthContext';
import { apiRequest } from '../lib/api';

function formatDateTime(value) {
  if (!value) {
    return 'No data yet';
  }

  return new Date(value).toLocaleString();
}

function formatSleepWindow(settings) {
  if (!settings?.sleepTimerEnabled) {
    return 'Off';
  }

  return `${settings.sleepStartHour}:00 to ${settings.sleepEndHour}:00 (${settings.sleepTimezone})`;
}

export default function UserDetailPage() {
  const { id } = useParams();
  const { token } = useAdminAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-dashboard', id],
    queryFn: () => apiRequest(`/admin/users/${id}/dashboard`, { token }),
  });

  if (isLoading) {
    return <div className="screen-shell">Loading user dashboard...</div>;
  }

  if (error) {
    return <div className="error-banner">{error.message}</div>;
  }

  return (
    <div className="page-stack">
      <Link to="/admin/users" className="back-link">
        ← Back to users
      </Link>

      <div className="panel-grid">
        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Profile</p>
              <h3>{data.user.name}</h3>
            </div>
            <SubscriptionBadge plan={data.subscription.plan} status={data.subscription.status} />
          </div>
          <div className="detail-grid">
            <div>
              <span className="detail-label">Username</span>
              <strong>{data.user.username}</strong>
            </div>
            <div>
              <span className="detail-label">Email</span>
              <strong>{data.user.email}</strong>
            </div>
            <div>
              <span className="detail-label">Phone</span>
              <strong>{data.user.phone}</strong>
            </div>
            <div>
              <span className="detail-label">Age</span>
              <strong>{data.user.age}</strong>
            </div>
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Settings</p>
              <h3>Monitoring profile</h3>
            </div>
          </div>
          <div className="detail-grid">
            <div>
              <span className="detail-label">Check-in interval</span>
              <strong>{data.settings.checkInIntervalHours} hours</strong>
            </div>
            <div>
              <span className="detail-label">Countdown</span>
              <strong>{data.settings.emergencyCountdownMinutes} minutes</strong>
            </div>
            <div>
              <span className="detail-label">DND state</span>
              <strong>{data.settings.effectiveDnd ? `On (${data.settings.dndReason || 'manual'})` : 'Off'}</strong>
            </div>
            <div>
              <span className="detail-label">Sleep window</span>
              <strong>{formatSleepWindow(data.settings)}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="panel-grid">
        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Contacts</p>
              <h3>Emergency reach list</h3>
            </div>
          </div>
          <div className="list-stack">
            {data.contacts?.length ? (
              data.contacts.map(contact => (
                <article key={contact.id} className="list-row">
                  <div>
                    <strong>{contact.name}</strong>
                    <p>
                      Priority {contact.priority} · {contact.countryCode}
                      {contact.phone}
                    </p>
                  </div>
                  <span>{contact.email || 'No email'}</span>
                </article>
              ))
            ) : (
              <div className="empty-state">No contacts configured.</div>
            )}
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Summary</p>
              <h3>Lifetime stats</h3>
            </div>
          </div>
          <div className="detail-grid">
            <div>
              <span className="detail-label">Last alarm</span>
              <strong>{formatDateTime(data.stats.lastAlarmTime)}</strong>
            </div>
            <div>
              <span className="detail-label">Last contact</span>
              <strong>{formatDateTime(data.stats.lastContactTime)}</strong>
            </div>
            <div>
              <span className="detail-label">Total alarms</span>
              <strong>{data.stats.totalAlarmsEver}</strong>
            </div>
            <div>
              <span className="detail-label">Contact calls</span>
              <strong>{data.stats.totalContactCallsEver}</strong>
            </div>
            <div>
              <span className="detail-label">OK responses</span>
              <strong>{data.stats.totalOkResponses}</strong>
            </div>
            <div>
              <span className="detail-label">Missed responses</span>
              <strong>{data.stats.totalMissedResponses}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Trend</p>
            <h3>Month-over-month activity</h3>
          </div>
        </div>
        <TrendChart data={data.trend} />
      </section>

      <div className="stats-grid">
        <section className="panel-card compact-panel">
          <p className="eyebrow">Monthly averages</p>
          <h3>{data.monthlyAverages.alarmsPerMonth} alarms</h3>
          <p className="muted-copy">
            {data.monthlyAverages.emergenciesPerMonth} emergencies · {Math.round(data.monthlyAverages.okRate * 100)}% OK rate
          </p>
        </section>
        <section className="panel-card compact-panel">
          <p className="eyebrow">Yearly averages</p>
          <h3>{data.yearlyAverages.alarmsPerYear} alarms</h3>
          <p className="muted-copy">
            {data.yearlyAverages.emergenciesPerYear} emergencies · {Math.round(data.yearlyAverages.okRate * 100)}% OK rate
          </p>
        </section>
      </div>
    </div>
  );
}
