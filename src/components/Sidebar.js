'use client';

import { 
  UserIcon, 
  UsersIcon, 
  SettingsIcon, 
  HistoryIcon,
  LogoIcon, 
  LogOutIcon, 
  SunIcon, 
  MoonIcon 
} from './Icons';

export default function Sidebar({ 
  activeView, 
  setActiveView, 
  theme, 
  toggleTheme, 
  user, 
  onSignOut, 
  credits, 
  onBuyCredits 
}) {
  const navItems = [
    { id: 'individual', label: 'Single Analysis', IconComponent: UserIcon },
    { id: 'batch', label: 'Batch Analysis', IconComponent: UsersIcon },
    { id: 'history', label: 'History', IconComponent: HistoryIcon },
    { id: 'settings', label: 'Settings', IconComponent: SettingsIcon }
  ];

  return (
    <aside className="sidebar flex-col justify-between">
      {/* Top Brand & Nav */}
      <div className="flex-col gap-6">
        {/* Brand Header */}
        <div className="brand flex align-center gap-3">
          <div className="brand-logo flex align-center justify-center">
            <LogoIcon size={18} className="logo-svg" style={{ color: 'var(--surface)' }} />
          </div>
          <span className="brand-name">blunlty</span>
        </div>

        {/* Navigation List */}
        <nav className="nav flex-col gap-2">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.IconComponent;

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`nav-btn flex align-center gap-3 ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon flex align-center justify-center">
                  <Icon size={18} />
                </span>
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Bottom (User Card & Theme Toggle) */}
      <div className="sidebar-footer flex-col gap-4">
        {/* User Card */}
        {user && (
          <div className="user-card flex-col gap-3">
            <div className="user-details flex-col">
              <span className="user-email truncate" title={user.email}>
                {user.email}
              </span>
              <span className="user-status">Authenticated</span>
            </div>
            
            {/* Credits Section */}
            <div className="credits-section flex align-center justify-between">
              <span className="credits-text font-sans">
                🪙 <strong className="font-mono">{credits}</strong> credits
              </span>
              <button 
                onClick={onBuyCredits} 
                className="button-secondary buy-credits-btn font-sans" 
                title="Top Up +10 Credits"
              >
                + Top Up
              </button>
            </div>

            <button 
              onClick={onSignOut} 
              className="sign-out-btn flex align-center justify-center gap-2" 
              title="Sign Out"
            >
              <LogOutIcon size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn flex align-center justify-center gap-2" 
          title="Toggle Theme"
        >
          {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      <style jsx>{`
        .sidebar {
          background-color: var(--surface);
          border-right: 1px solid var(--border);
          padding: var(--space-24) var(--space-16);
          height: 100vh;
          width: 260px;
          flex-shrink: 0;
          z-index: 100;
          transition: background-color var(--transition-speed) ease, border-color var(--transition-speed) ease;
        }

        .brand {
          padding-bottom: var(--space-16);
          border-bottom: 1px solid var(--border);
        }

        .brand-logo {
          background-color: var(--primary);
          border-radius: 8px;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }

        .brand-name {
          font-family: var(--font-primary);
          font-weight: 700;
          font-size: 18px;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }

        .nav {
          width: 100%;
        }

        .nav-btn {
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-btn);
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-primary);
          font-size: 14px;
          font-weight: 600;
          padding: 10px 14px;
          text-align: left;
          width: 100%;
          transition: background-color var(--transition-speed) ease, color var(--transition-speed) ease;
        }

        .nav-btn:hover {
          background-color: var(--bg);
          color: var(--text-primary);
        }

        .nav-btn.active {
          background-color: var(--bg);
          color: var(--primary);
          border-color: var(--border);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-footer {
          border-top: 1px solid var(--border);
          padding-top: var(--space-24);
        }

        .user-card {
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          padding: var(--space-12);
        }

        .user-details {
          padding-bottom: var(--space-8);
          border-bottom: 1px solid var(--border);
        }

        .user-email {
          font-family: var(--font-secondary);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .user-status {
          font-family: var(--font-secondary);
          font-size: 11px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin-top: 2px;
        }

        .credits-section {
          font-size: 12px;
          color: var(--text-primary);
        }

        .credits-text {
          font-weight: 600;
        }

        .buy-credits-btn {
          padding: 4px 8px !important;
          font-size: 11px !important;
          border-radius: 8px !important;
        }

        .sign-out-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-primary);
          font-size: 12px;
          font-weight: 600;
          padding: 4px 0 0 0;
          width: 100%;
          justify-content: flex-start;
          transition: color var(--transition-speed) ease;
        }

        .sign-out-btn:hover {
          color: var(--danger);
        }

        .theme-toggle-btn {
          background-color: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius-btn);
          color: var(--text-primary);
          cursor: pointer;
          font-family: var(--font-primary);
          font-size: 14px;
          font-weight: 600;
          padding: 10px;
          width: 100%;
          transition: background-color var(--transition-speed) ease, border-color var(--transition-speed) ease;
        }

        .theme-toggle-btn:hover {
          background-color: var(--bg);
          border-color: var(--text-secondary);
        }
      `}</style>
    </aside>
  );
}
