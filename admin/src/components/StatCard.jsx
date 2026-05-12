import React from 'react';

export default function StatCard({ label, value, detail, tone = 'blue' }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <p className="eyebrow">{label}</p>
      <h3>{value}</h3>
      {detail ? <p className="muted-copy">{detail}</p> : null}
    </article>
  );
}
