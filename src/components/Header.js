'use client';

import { useState, useEffect, useRef } from 'react';
import { BotIcon, AlertIcon, UserIcon, UsersIcon, LogOutIcon, SettingsIcon, ClockIcon, XIcon } from './Icons';

export default function Header({ 
  activeView, 
  setActiveView, 
  individualSection,
  setIndividualSection,
  batchSection,
  setBatchSection,
  isMock,
  user,
  credits,
  onBuyCredits,
  onSignOut
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(true);

  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Welcome to bluntly',
      desc: 'Check candidate details or batch upload to start analyzing.',
      time: 'Just now',
      unread: true,
      type: 'info'
    },
    {
      id: 2,
      title: 'Credits Available',
      desc: `${credits || 0} credits remaining. Top up anytime.`,
      time: '10 mins ago',
      unread: true,
      type: 'credits'
    },
    {
      id: 3,
      title: 'Model Connection',
      desc: isMock ? 'Running on simulation mock API.' : 'Connected to Google Gemini active API.',
      time: '1 hour ago',
      unread: false,
      type: 'model'
    }
  ]);

  // Sync notifications with credits and isMock when props change
  useEffect(() => {
    setNotifications(prev => prev.map(notif => {
      if (notif.type === 'credits') {
        return { ...notif, desc: `${credits || 0} credits remaining. Top up anytime.` };
      }
      if (notif.type === 'model') {
        return { ...notif, desc: isMock ? 'Running on simulation mock API.' : 'Connected to Google Gemini active API.' };
      }
      return notif;
    }));
  }, [credits, isMock]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowProfile(false);
    setUnreadNotifications(false);
  };

  const handleClearNotifications = (e) => {
    e.stopPropagation();
    setNotifications([]);
  };

  const handleRemoveNotification = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

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
          <div ref={notificationsRef} className="relative">
            <button 
              onClick={handleToggleNotifications}
              className={`header-icon-btn relative ${showNotifications ? 'active' : ''}`} 
              title="Notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadNotifications && notifications.length > 0 && (
                <span className="notification-dot"></span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="dropdown-panel notifications-panel fade-in">
                <div className="dropdown-header flex align-center justify-between">
                  <span className="dropdown-title">Notifications</span>
                  {notifications.length > 0 && (
                    <button 
                      onClick={handleClearNotifications} 
                      className="clear-all-btn font-sans"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="dropdown-divider"></div>
                <div className="notifications-list flex-col">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div key={notif.id} className={`notification-item flex gap-3 ${notif.unread ? 'unread' : ''}`}>
                        <div className="notification-icon-container flex align-center justify-center">
                          {notif.type === 'credits' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#EAB308">
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="6" fill="#CA8A04" />
                            </svg>
                          ) : notif.type === 'model' ? (
                            <BotIcon size={14} style={{ color: 'var(--primary)' }} />
                          ) : (
                            <ClockIcon size={14} style={{ color: 'var(--text-secondary)' }} />
                          )}
                        </div>
                        <div className="notification-content flex-1">
                          <div className="notification-title flex align-center justify-between">
                            <span>{notif.title}</span>
                            <span className="notification-time">{notif.time}</span>
                          </div>
                          <p className="notification-desc">{notif.desc}</p>
                        </div>
                        <button 
                          onClick={(e) => handleRemoveNotification(notif.id, e)}
                          className="notification-dismiss-btn"
                          title="Dismiss"
                        >
                          <XIcon size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="notifications-empty flex-col align-center justify-center gap-2">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, color: 'var(--text-secondary)' }}>
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      <span className="font-sans" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        All caught up!
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile dropdown trigger */}
          <div ref={profileRef} className="relative">
            <div 
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className={`flex align-center gap-1 cursor-pointer profile-trigger ${showProfile ? 'active' : ''}`} 
              title="User Menu"
            >
              <div className="profile-avatar flex align-center justify-center">
                {user?.email ? user.email.charAt(0).toUpperCase() : 'N'}
              </div>
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ 
                  opacity: 0.7,
                  transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {/* Profile Dropdown Panel */}
            {showProfile && (
              <div className="dropdown-panel profile-dropdown-panel fade-in">
                <div className="profile-dropdown-userinfo flex align-center gap-3">
                  <div className="profile-avatar large flex align-center justify-center">
                    {user?.email ? user.email.charAt(0).toUpperCase() : 'N'}
                  </div>
                  <div className="flex-col">
                    <span className="profile-dropdown-name">{user?.email ? user.email.split('@')[0] : 'User'}</span>
                    <span className="profile-dropdown-email">{user?.email || 'user@example.com'}</span>
                  </div>
                </div>
                
                <div className="dropdown-divider"></div>

                <div className="profile-dropdown-credits flex align-center justify-between">
                  <span className="credits-text font-sans flex align-center" style={{ gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#EAB308" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" fill="#CA8A04" />
                    </svg>
                    <span style={{ fontWeight: '500', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <strong>{credits || 0}</strong> Credits
                    </span>
                  </span>
                  {onBuyCredits && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onBuyCredits();
                      }} 
                      className="top-up-btn-small" 
                      title="Top Up +10 Credits"
                    >
                      Top Up
                    </button>
                  )}
                </div>

                <div className="dropdown-divider"></div>

                <div className="profile-dropdown-actions flex-col">
                  <button 
                    onClick={() => {
                      if (onSignOut) onSignOut();
                      setShowProfile(false);
                    }}
                    className="profile-dropdown-item flex align-center gap-2 danger-item"
                  >
                    <LogOutIcon size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
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

        /* Dropdown panels and lists styling */
        .dropdown-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.3), 0 8px 20px -6px rgba(0, 0, 0, 0.2);
          z-index: 100;
          overflow: hidden;
          animation: dropdownFadeIn 0.2s ease-out;
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .notifications-panel {
          width: 320px;
        }

        .profile-dropdown-panel {
          width: 240px;
          padding: var(--space-12) 0;
        }

        .dropdown-header {
          padding: var(--space-12) var(--space-16);
        }

        .dropdown-title {
          font-family: var(--font-primary);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .clear-all-btn {
          background: transparent;
          border: none;
          color: var(--primary);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          transition: background-color var(--transition-speed) ease;
        }

        .clear-all-btn:hover {
          background-color: rgba(15, 118, 110, 0.08);
        }

        .dropdown-divider {
          height: 1px;
          background-color: var(--border);
          margin: 0;
        }

        .notifications-list {
          max-height: 280px;
          overflow-y: auto;
        }

        .notification-item {
          padding: var(--space-12) var(--space-16);
          border-bottom: 1px solid var(--border);
          position: relative;
          transition: background-color var(--transition-speed) ease;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-item:hover {
          background-color: var(--bg);
        }

        .notification-item.unread {
          background-color: rgba(15, 118, 110, 0.02);
        }

        .notification-icon-container {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: var(--bg);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notification-content {
          min-width: 0;
        }

        .notification-title {
          font-family: var(--font-primary);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .notification-time {
          font-size: 10px;
          color: var(--text-secondary);
          opacity: 0.7;
          font-weight: 400;
        }

        .notification-desc {
          font-family: var(--font-secondary);
          font-size: 11.5px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin: 0;
          word-wrap: break-word;
        }

        .notification-dismiss-btn {
          opacity: 0;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          align-self: flex-start;
          transition: all var(--transition-speed) ease;
        }

        .notification-item:hover .notification-dismiss-btn {
          opacity: 0.6;
        }

        .notification-dismiss-btn:hover {
          opacity: 1 !important;
          background-color: var(--border);
          color: var(--text-primary);
        }

        .notifications-empty {
          padding: var(--space-32) var(--space-16);
          text-align: center;
        }

        .profile-dropdown-userinfo {
          padding: 0 var(--space-16) var(--space-12) var(--space-16);
        }

        .profile-avatar.large {
          width: 38px;
          height: 38px;
          font-size: 16px;
        }

        .profile-dropdown-name {
          font-family: var(--font-primary);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .profile-dropdown-email {
          font-family: var(--font-secondary);
          font-size: 11px;
          color: var(--text-secondary);
          word-break: break-all;
        }

        .profile-dropdown-credits {
          padding: var(--space-12) var(--space-16);
          background-color: rgba(15, 118, 110, 0.02);
        }

        .top-up-btn-small {
          background-color: var(--primary);
          color: #FFFFFF;
          border: none;
          border-radius: var(--radius-btn);
          font-family: var(--font-primary);
          font-weight: 700;
          font-size: 11px;
          padding: 4px 8px;
          cursor: pointer;
          transition: background-color var(--transition-speed) ease;
        }

        .top-up-btn-small:hover {
          background-color: var(--primary-dark, #0d9488);
        }

        .profile-dropdown-actions {
          padding: var(--space-8) var(--space-8) 0 var(--space-8);
          gap: 2px;
        }

        .profile-dropdown-item {
          width: 100%;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-primary);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all var(--transition-speed) ease;
          text-align: left;
        }

        .profile-dropdown-item:hover {
          background-color: var(--bg);
          color: var(--text-primary);
        }

        .profile-dropdown-item.danger-item {
          color: var(--text-secondary);
        }

        .profile-dropdown-item.danger-item:hover {
          background-color: rgba(239, 68, 68, 0.08);
          color: var(--danger);
        }

        .header-icon-btn.active, .profile-trigger.active {
          background-color: var(--bg);
          color: var(--text-primary);
          opacity: 1;
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
