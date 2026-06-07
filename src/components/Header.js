'use client';

import { BotIcon, AlertIcon, UserIcon, UsersIcon } from './Icons';

export default function Header({ 
  activeView, 
  setActiveView, 
  individualSection,
  setIndividualSection,
  batchSection,
  setBatchSection,
  isMock 
}) {
  const getTitle = () => {
    switch (activeView) {
      case 'individual':
        return 'Single Analysis';
      case 'batch':
        return 'Batch Analysis';
      case 'history':
        return 'History Log';
      case 'settings':
        return 'System Configuration';
      default:
        return 'Resume Analyzer';
    }
  };

  const handleToggleMode = (mode) => {
    if (mode === 'single') {
      setActiveView('individual');
    } else {
      setActiveView('batch');
      setBatchSection('input');
    }
  };

  const showSwitcher = activeView === 'individual' || activeView === 'batch';

  return (
    <header className="header flex align-center justify-between">
      {/* Title / Back Button & Mode Badge */}
      <div className="flex align-center gap-3">
        {activeView === 'individual' && individualSection === 'analysis' ? (
          <button 
            onClick={() => setIndividualSection('input')} 
            className="back-link flex align-center gap-1 font-primary"
            style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: 'var(--primary)', 
              cursor: 'pointer', 
              background: 'none', 
              border: 'none', 
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back to Analyses</span>
          </button>
        ) : activeView === 'batch' && batchSection === 'analysis' ? (
          <button 
            onClick={() => setBatchSection('input')} 
            className="back-link flex align-center gap-1 font-primary"
            style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: 'var(--primary)', 
              cursor: 'pointer', 
              background: 'none', 
              border: 'none', 
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back to Analyses</span>
          </button>
        ) : (
          <>
            <h1 className="header-title">{getTitle()}</h1>
            
            {/* Outlined AI Mode Badge */}
            <div className={`gemini-active-badge ${isMock ? 'mock' : ''}`}>
              <span className="status-dot"></span>
              <span>{isMock ? 'GEMINI OFFLINE' : 'GEMINI ACTIVE'}</span>
            </div>
          </>
        )}
      </div>

      {/* Right side widgets group (Switcher + Info/User) */}
      <div className="flex align-center gap-6">
        {/* Segmented Control Switcher */}
        {showSwitcher && (
          <div className="switcher-capsule">
            <button 
              onClick={() => handleToggleMode('single')}
              className={`switcher-btn ${activeView === 'individual' ? 'active' : ''}`}
            >
              <span>Single</span>
            </button>
            <button 
              onClick={() => handleToggleMode('batch')}
              className={`switcher-btn ${activeView === 'batch' ? 'active' : ''}`}
            >
              <span>Batch</span>
            </button>
          </div>
        )}

        {/* Far Right widgets */}
        <div className="flex align-center gap-4">
          {/* Help Icon */}
          <button className="header-icon-btn" title="Help">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          {/* Notifications Icon with Dot */}
          <button className="header-icon-btn relative" title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="notification-dot"></span>
          </button>

          {/* User profile dropdown trigger */}
          <div className="flex align-center gap-1 cursor-pointer profile-trigger" title="User Menu">
            <div className="profile-avatar flex align-center justify-center">
              N
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      <style jsx>{`
        .header {
          background-color: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: var(--space-16) var(--space-32);
          position: sticky;
          top: 0;
          z-index: 90;
          height: 70px;
          transition: background-color var(--transition-speed) ease, border-color var(--transition-speed) ease;
        }

        .header-title {
          font-family: var(--font-primary);
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .header-icon-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          opacity: 0.7;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 50%;
          transition: all var(--transition-speed) ease;
        }

        .header-icon-btn:hover {
          background-color: var(--bg);
          color: var(--text-primary);
          opacity: 1;
        }

        .relative {
          position: relative;
        }

        .notification-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 8px;
          height: 8px;
          background-color: var(--success);
          border: 1.5px solid var(--surface);
          border-radius: 50%;
        }

        .profile-trigger {
          display: flex;
          align-items: center;
          gap: var(--space-8);
          padding: 4px 8px;
          border-radius: 9999px;
          transition: background-color var(--transition-speed) ease;
        }

        .profile-trigger:hover {
          background-color: var(--bg);
        }

        .profile-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: var(--border);
          color: var(--text-secondary);
          font-family: var(--font-primary);
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .header {
            padding: var(--space-16);
          }
          .header-title {
            font-size: 18px;
          }
        }
      `}</style>
    </header>
  );
}
