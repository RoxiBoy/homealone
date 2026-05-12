import React from 'react';

export default function SubscriptionBadge({ plan, status }) {
  const normalizedPlan = plan || 'free';
  const normalizedStatus = status || 'inactive';

  return (
    <span className={`badge plan-${normalizedPlan}`}>
      {normalizedPlan} · {normalizedStatus}
    </span>
  );
}
