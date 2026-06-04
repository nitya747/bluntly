'use client';

import { 
  UserIcon, 
  UsersIcon, 
  SettingsIcon, 
  LogoIcon, 
  LogOutIcon, 
  SunIcon, 
  MoonIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon 
} from './Icons';

export default function Sidebar({ activeView, setActiveView, theme, toggleTheme, collapsed, setCollapsed, user, onSignOut, credits, onBuyCredits }) {
  const navItems = [
    { id: 'individual', label: 'Single Analysis', IconComponent: UserIcon },
    { id: 'batch', label: 'Batch Ranking', IconComponent: UsersIcon },
    { id: 'settings', label: 'Settings', IconComponent: SettingsIcon }
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="brand flex align-center gap-3">
        <div className="brand-logo flex align-center justify-center">
          <LogoIcon size={20} className="logo-text" style={{ color: '#FFFFFF' }} />
        </div>
        {!collapsed && <span className="brand-name font-sans">blunlty</span>}
      </div>

      {/* Navigation List */}
      <nav className="nav flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const isComingSoon = item.badge === 'Soon';
          const Icon = item.IconComponent;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (!isComingSoon) {
                  setActiveView(item.id);
                }
              }}
              disabled={isComingSoon}
              className={`nav-btn flex align-center justify-between ${isActive ? 'active' : ''} ${isComingSoon ? 'disabled' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <div className="flex align-center gap-3">
                <span className="nav-icon flex align-center justify-center">
                  <Icon size={18} />
                </span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </div>
              {!collapsed && item.badge && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer flex-col gap-3">
        {/* User Email & Sign Out */}
        {user && (
          <div className="user-profile flex-col gap-2">
            {!collapsed && (
              <div className="user-details flex-col">
                <span className="user-email truncate" title={user.email}>
                  {user.email}
                </span>
                <span className="user-status font-mono">Authenticated</span>
              </div>
            )}
            
            {/* Credits Section */}
            <div className="credits-section flex-col gap-1.5 mt-1">
              {collapsed ? (
                <div className="credits-info-collapsed flex-col align-center justify-center gap-1" title={`${credits} credits remaining`}>
                  <span className="credits-text-collapsed font-sans text-center">
                    🪙<strong className="font-mono" style={{ marginLeft: '1px' }}>{credits}</strong>
                  </span>
                  <button onClick={onBuyCredits} className="buy-credits-btn-collapsed font-mono" title="Top Up +10 Credits">
                    +10
                  </button>
                </div>
              ) : (
                <div className="credits-info flex align-center justify-between">
                  <span className="credits-text font-sans flex align-center gap-1">
                    🪙 <strong className="font-mono">{credits}</strong> credits
                  </span>
                  <button onClick={onBuyCredits} className="buy-credits-btn font-sans" title="Top Up +10 Credits">
                    + Top Up
                  </button>
                </div>
              )}
            </div>

            <button onClick={onSignOut} className="sign-out-btn flex align-center justify-center" title="Sign Out">
              <span className="sign-out-icon flex align-center justify-center">
                <LogOutIcon size={16} />
              </span>
              {!collapsed && <span className="sign-out-label">Sign Out</span>}
            </button>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button onClick={toggleTheme} className="theme-toggle-btn flex align-center justify-center" title="Toggle Theme">
          <span className="toggle-icon flex align-center justify-center">
            {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </span>
          {!collapsed && <span className="toggle-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Collapse Sidebar Button */}
        <button onClick={() => setCollapsed(!collapsed)} className="collapse-btn flex align-center justify-center">
          <span className="flex align-center justify-center">
            {collapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
          </span>
        </button>
      </div>

      <style jsx>{`
        .sidebar {
          background-color: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          padding: 1.5rem 1rem;
          height: 100vh;
          position: sticky;
          top: 0;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 240px;
          z-index: 100;
        }

        .sidebar.collapsed {
          width: 70px;
          padding: 1.5rem 0.5rem;
        }

        .brand {
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 1.5rem;
          padding-left: 0.5rem;
        }

        .brand-logo {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border-radius: 8px;
          width: 36px;
          height: 36px;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .brand-name {
          font-weight: 700;
          font-size: 1.15rem;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, var(--text-primary), var(--text-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .nav {
          flex: 1;
        }

        .nav-btn {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 12px;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 0.95rem;
          font-weight: 600;
          padding: 0.75rem 1rem;
          text-align: left;
          transition: all 0.2s ease;
          width: 100%;
        }

        .sidebar.collapsed .nav-btn {
          padding: 0.75rem 0;
          justify-content: center;
        }

        .nav-btn:hover:not(.disabled) {
          background-color: var(--primary-light);
          color: var(--primary);
        }

        .nav-btn.active {
          background-color: var(--primary-light);
          color: var(--primary);
          border-color: var(--border-glow);
        }

        .nav-icon {
          font-size: 1.2rem;
        }

        .nav-badge {
          background-color: var(--warning-bg);
          color: var(--warning);
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 999px;
          text-transform: uppercase;
        }

        .nav-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sidebar-footer {
          margin-top: auto;
          border-top: 1px solid var(--border-color);
          padding-top: 1.5rem;
        }

        .user-profile {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .sidebar.collapsed .user-profile {
          padding: 0.5rem;
        }

        .user-details {
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-color);
          overflow: hidden;
        }

        .user-email {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .user-status {
          font-size: 0.6rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-top: 0.15rem;
        }

        .sign-out-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.35rem 0;
          width: 100%;
          justify-content: flex-start;
          gap: 0.5rem;
          transition: color 0.2s;
        }

        .sidebar.collapsed .sign-out-btn {
          justify-content: center;
          padding: 0.25rem 0;
        }

        .sign-out-btn:hover {
          color: var(--danger);
        }

        .theme-toggle-btn {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          color: var(--text-primary);
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 0.9rem;
          font-weight: 600;
          padding: 0.75rem;
          transition: all 0.2s ease;
          width: 100%;
          gap: 0.5rem;
        }

        .theme-toggle-btn:hover {
          border-color: var(--primary);
          background-color: var(--primary-light);
        }

        .collapse-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 1.1rem;
          padding: 0.5rem;
          width: 100%;
          transition: color 0.2s;
        }

        .collapse-btn:hover {
          color: var(--primary);
        }

        .credits-section {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.5rem;
          margin-bottom: 0.25rem;
          width: 100%;
        }

        .sidebar.collapsed .credits-section {
          background: transparent;
          border: none;
          padding: 0;
          margin-bottom: 0.25rem;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .credits-info {
          font-size: 0.8rem;
          color: var(--text-primary);
          width: 100%;
        }

        .credits-info-collapsed {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .credits-text {
          font-weight: 600;
        }

        .credits-text-collapsed {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .buy-credits-btn {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: #FFFFFF;
          border: none;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .buy-credits-btn:hover {
          opacity: 0.9;
        }

        .buy-credits-btn-collapsed {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: #FFFFFF;
          border: none;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.25rem 0.4rem;
          border-radius: 6px;
          cursor: pointer;
          text-align: center;
          width: 100%;
          max-width: 44px;
        }

        .buy-credits-btn-collapsed:hover {
          opacity: 0.9;
        }

        .sidebar.collapsed .user-profile {
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
      `}</style>
    </aside>
  );
}
