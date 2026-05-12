import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import SubscriptionBadge from './SubscriptionBadge';

function SortButton({ label, active, direction, onClick }) {
  return (
    <button type="button" className="sort-button" onClick={onClick}>
      <span>{label}</span>
      {active ? direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} /> : null}
    </button>
  );
}

export default function UserTable({
  users,
  sortKey,
  sortDirection,
  onSort,
  onSelect,
}) {
  return (
    <div className="table-card">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>
              <SortButton
                label="Name"
                active={sortKey === 'name'}
                direction={sortDirection}
                onClick={() => onSort('name')}
              />
            </th>
            <th>Plan</th>
            <th>
              <SortButton
                label="Alarms"
                active={sortKey === 'alarms'}
                direction={sortDirection}
                onClick={() => onSort('alarms')}
              />
            </th>
            <th>
              <SortButton
                label="Emergencies"
                active={sortKey === 'emergencies'}
                direction={sortDirection}
                onClick={() => onSort('emergencies')}
              />
            </th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id} className="table-row-clickable" onClick={() => onSelect(user.id)}>
              <td>{index + 1}</td>
              <td>
                <div className="table-primary">{user.name}</div>
                <div className="table-secondary">{user.email}</div>
              </td>
              <td>
                <SubscriptionBadge
                  plan={user.subscription?.plan}
                  status={user.subscription?.status}
                />
              </td>
              <td>{user.stats?.totalAlarmsEver ?? 0}</td>
              <td>{user.stats?.totalEmergencies ?? 0}</td>
              <td>
                <span className={`status-pill status-${user.checkInStatus}`}>{user.checkInStatus}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
