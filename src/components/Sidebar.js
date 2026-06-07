'use client';

import { useState } from 'react';
import { 
  SettingsIcon, 
  HistoryIcon,
  LogoIcon, 
  LogOutIcon, 
  SunIcon, 
  MoonIcon,
  ConfigureIcon,
  AnalysisReportIcon,
  BatchAnalysisIcon,
  BatchRankingIcon
} from './Icons';

export default function Sidebar({ 
  activeView, 
  setActiveView, 
  individualSection,
  setIndividualSection,
  batchSection,
  setBatchSection,
  theme, 
  toggleTheme, 
  user, 
  onSignOut, 
  credits, 
  onBuyCredits 
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isConfigureActive = activeView === 'individual' && individualSection === 'input';
  const isReportActive = activeView === 'individual' && individualSection === 'analysis';
  const isBatchActive = activeView === 'batch' && batchSection === 'input';
  const isBatchRankingActive = activeView === 'batch' && batchSection === 'analysis';
  const isHistoryActive = activeView === 'history';
  const isSettingsActive = activeView === 'settings';

  return (
    <aside className={`sidebar flex-col justify-between ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Top Brand & Nav */}
      <div className="flex-col gap-6">
        {/* Brand Header */}
        <div className="brand flex align-center gap-3">
          <div className="brand-logo flex align-center justify-center">
            <LogoIcon size={18} className="logo-svg" style={{ color: '#FFFFFF' }} />
          </div>
          <span className="brand-name">bluntly</span>
        </div>

        {/* Navigation List */}
        <nav className="nav flex-col">
          {/* SINGLE ANALYSIS */}
          {!isCollapsed && <div className="nav-section-title">Single Analysis</div>}
          <div className="flex-col gap-1">
            <button
              onClick={() => {
                setActiveView('individual');
                setIndividualSection('input');
              }}
              className={`nav-item-btn ${isConfigureActive ? 'active' : ''}`}
              title={isCollapsed ? "Configure" : undefined}
            >
              <ConfigureIcon size={18} />
              {!isCollapsed && <span className="nav-label">Configure</span>}
              {!isCollapsed && isConfigureActive && <span className="active-indicator" />}
            </button>
            <button
              onClick={() => {
                setActiveView('individual');
                setIndividualSection('analysis');
              }}
              className={`nav-item-btn ${isReportActive ? 'active' : ''}`}
              title={isCollapsed ? "Analysis Report" : undefined}
            >
              <AnalysisReportIcon size={18} />
              {!isCollapsed && <span className="nav-label">Analysis Report</span>}
              {!isCollapsed && isReportActive && <span className="active-indicator" />}
            </button>
          </div>

          {/* BATCH ANALYSIS */}
          {!isCollapsed && <div className="nav-section-title">Batch Analysis</div>}
          <div className="flex-col gap-1">
            <button
              onClick={() => {
                setActiveView('batch');
                setBatchSection('input');
              }}
              className={`nav-item-btn ${isBatchActive ? 'active' : ''}`}
              title={isCollapsed ? "Batch Analysis" : undefined}
            >
              <BatchAnalysisIcon size={18} />
              {!isCollapsed && <span className="nav-label">Batch Analysis</span>}
              {!isCollapsed && isBatchActive && <span className="active-indicator" />}
            </button>
            <button
              onClick={() => {
                setActiveView('batch');
                setBatchSection('analysis');
              }}
              className={`nav-item-btn ${isBatchRankingActive ? 'active' : ''}`}
              title={isCollapsed ? "Batch Ranking" : undefined}
            >
              <BatchRankingIcon size={18} />
              {!isCollapsed && <span className="nav-label">Batch Ranking</span>}
              {!isCollapsed && isBatchRankingActive && <span className="active-indicator" />}
            </button>
          </div>

          {/* OTHERS */}
          {!isCollapsed && <div className="nav-section-title">Others</div>}
          <div className="flex-col gap-1">
            <button
              onClick={() => setActiveView('history')}
              className={`nav-item-btn ${isHistoryActive ? 'active' : ''}`}
              title={isCollapsed ? "History" : undefined}
            >
              <HistoryIcon size={18} />
              {!isCollapsed && <span className="nav-label">History</span>}
              {!isCollapsed && isHistoryActive && <span className="active-indicator" />}
            </button>
            <button
              onClick={() => setActiveView('settings')}
              className={`nav-item-btn ${isSettingsActive ? 'active' : ''}`}
              title={isCollapsed ? "Settings" : undefined}
            >
              <SettingsIcon size={18} />
              {!isCollapsed && <span className="nav-label">Settings</span>}
              {!isCollapsed && isSettingsActive && <span className="active-indicator" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Sidebar Bottom (User Card & Theme Toggle) */}
      <div className="sidebar-footer flex-col gap-4">
        {/* User Card */}
        {user && (
          <div className="user-card flex flex-col gap-3">
            {/* Credits Section */}
            <div className="credits-section w-full">
              <div className="sidebar-credits">
                <span className="credits-text font-sans flex align-center" style={{ gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#EAB308" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" fill="#CA8A04" />
                  </svg>
                  <span style={{ fontWeight: '500' }}><strong className="font-mono">{credits}</strong> Credits</span>
                </span>
                <button 
                  onClick={onBuyCredits} 
                  className="top-up-btn" 
                  title="Top Up +10 Credits"
                >
                  Top Up
                </button>
              </div>
            </div>

            <button 
              onClick={onSignOut} 
              className="sign-out-btn flex align-center justify-start gap-2" 
              title="Sign Out"
            >
              <LogOutIcon size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Theme Toggle sliding switch */}
        {isCollapsed ? (
          <button 
            onClick={toggleTheme} 
            className="theme-toggle-btn flex align-center justify-center" 
            title="Toggle Theme"
          >
            {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        ) : (
          <div className="theme-switch-row flex align-center justify-between">
            <div className="flex align-center gap-2">
              <MoonIcon size={16} style={{ color: 'var(--text-secondary)' }} />
              <span className="theme-switch-label">Dark Mode</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={theme === 'dark'} 
                onChange={toggleTheme} 
              />
              <span className="slider round"></span>
            </label>
          </div>
        )}

        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="theme-toggle-btn flex align-center justify-center"
          style={{ border: 'none', background: 'transparent', padding: '4px', opacity: 0.6 }}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ 
              transform: isCollapsed ? 'rotate(180deg)' : 'none', 
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' 
            }}
          >
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
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
          display: flex;
          flex-direction: column;
        }

        .nav-section-title {
          font-family: var(--font-primary);
          font-size: 10px;
          font-weight: 700;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 16px 12px 6px 12px;
          text-align: left;
        }

        .nav-item-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-primary);
          font-size: 13px;
          font-weight: 600;
          padding: 10px 12px;
          width: 100%;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          transition: all var(--transition-speed) ease;
        }

        .nav-item-btn:hover {
          background-color: var(--bg);
          color: var(--text-primary);
        }

        .nav-item-btn.active {
          background-color: rgba(15, 118, 110, 0.05);
          color: var(--primary);
          font-weight: 700;
        }

        .active-indicator {
          position: absolute;
          right: 0;
          top: 15%;
          height: 70%;
          width: 3px;
          background-color: var(--primary);
          border-radius: 999px;
        }

        .sidebar-footer {
          border-top: 1px solid var(--border);
          padding-top: var(--space-16);
        }

        .user-card {
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          padding: var(--space-12);
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: var(--success);
          color: #FFFFFF;
          font-family: var(--font-primary);
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        .user-email {
          font-family: var(--font-secondary);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .user-status {
          font-family: var(--font-secondary);
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .credits-section {
          width: 100%;
        }

        .sign-out-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-primary);
          font-size: 12px;
          font-weight: 600;
          padding: 4px 0 0 4px;
          width: 100%;
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

        .theme-switch-row {
          width: 100%;
          padding: 8px 12px;
          border-radius: var(--radius-btn);
          border: 1px solid var(--border);
          background-color: var(--bg);
          transition: background-color var(--transition-speed) ease, border-color var(--transition-speed) ease;
        }

        .theme-switch-label {
          font-family: var(--font-primary);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        /* Sliding Switch */
        .switch {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 20px;
          flex-shrink: 0;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #CBD5E1;
          transition: .3s;
          border-radius: 20px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        input:checked + .slider {
          background-color: var(--primary);
        }

        input:checked + .slider:before {
          transform: translateX(16px);
        }
      `}</style>
    </aside>
  );
}
