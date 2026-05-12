import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import UserTable from '../components/UserTable';
import { useAdminAuth } from '../context/AdminAuthContext';
import { apiRequest } from '../lib/api';

function sortUsers(users, sortKey, sortDirection) {
  const multiplier = sortDirection === 'asc' ? 1 : -1;

  return [...users].sort((left, right) => {
    if (sortKey === 'alarms') {
      return (
        ((left.stats?.totalAlarmsEver ?? 0) - (right.stats?.totalAlarmsEver ?? 0)) * multiplier
      );
    }

    if (sortKey === 'emergencies') {
      return (
        ((left.stats?.totalEmergencies ?? 0) - (right.stats?.totalEmergencies ?? 0)) * multiplier
      );
    }

    return left.name.localeCompare(right.name) * multiplier;
  });
}

export default function UsersPage() {
  const navigate = useNavigate();
  const { token } = useAdminAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () =>
      apiRequest(`/admin/users?page=${page}&pageSize=12&search=${encodeURIComponent(search)}`, {
        token,
      }),
  });

  const handleSort = key => {
    if (sortKey === key) {
      setSortDirection(current => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  if (isLoading) {
    return <div className="screen-shell">Loading users...</div>;
  }

  if (error) {
    return <div className="error-banner">{error.message}</div>;
  }

  const sortedUsers = sortUsers(data.items, sortKey, sortDirection);

  return (
    <div className="page-stack">
      <section className="panel-card">
        <div className="panel-heading panel-heading-spread">
          <div>
            <p className="eyebrow">Users</p>
            <h3>Directory</h3>
          </div>
          <input
            className="search-input"
            placeholder="Search by name, username, or email"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
          />
        </div>

        <UserTable
          users={sortedUsers}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onSelect={id => navigate(`/admin/users/${id}`)}
        />

        <div className="pagination-row">
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          <div className="pagination-actions">
            <button
              type="button"
              className="ghost-button"
              disabled={data.page <= 1}
              onClick={() => setPage(current => Math.max(current - 1, 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(current => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
