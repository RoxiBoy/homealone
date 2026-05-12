import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Shield, Users } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

const links = [
  {
    label: 'Overview',
    to: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Users',
    to: '/admin/users',
    icon: Users,
  },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAdminAuth();

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Shield size={18} />
          </div>
          <div>
            <p className="eyebrow">HomeAlone</p>
            <h1>Admin</h1>
          </div>
        </div>

        <nav className="nav-stack">
          {links.map(link => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/admin'}
                className={({ isActive }) =>
                  `nav-link${isActive ? ' nav-link-active' : ''}`
                }
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <button type="button" className="ghost-button sidebar-logout" onClick={logout}>
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </aside>

      <main className="content-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operations</p>
            <h2 className="page-title">
              {location.pathname === '/admin'
                ? 'Dashboard overview'
                : location.pathname.startsWith('/admin/users/')
                  ? 'User detail'
                  : 'User directory'}
            </h2>
          </div>

          <div className="avatar-chip">
            <div className="avatar-circle">
              {user?.name?.slice(0, 1)?.toUpperCase() || user?.username?.slice(0, 1)?.toUpperCase() || 'A'}
            </div>
            <div>
              <strong>{user?.name || user?.username || 'Admin'}</strong>
              <p>{user?.email || 'Administrator'}</p>
            </div>
          </div>
        </header>

        <section className="page-content">{children}</section>
      </main>
    </div>
  );
}
