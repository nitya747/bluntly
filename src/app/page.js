'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import RightPanel from '../components/RightPanel';
import IndividualView from '../components/IndividualView';
import BatchView from '../components/BatchView';
import { createClient } from '../lib/supabase/client';
import { SettingsIcon, BotIcon } from '../components/Icons';

export default function Home() {
  const [activeView, setActiveView] = useState('individual');
  const [theme, setTheme] = useState('dark'); // Default to dark for premium aesthetic
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [history, setHistory] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isMock, setIsMock] = useState(true);
  const [user, setUser] = useState(null);

  const supabase = createClient();

  // Load theme, fetch user, and check AI backend status on mount
  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Fetch user and session-based scans history
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchHistory();
      } else {
        const match = document.cookie.match(new RegExp('(^| )blunlty_bypass=([^;]+)'));
        if (match && match[2] === 'true') {
          setUser({ email: 'developer@blunlty.local', id: 'mock-dev-id' });
        }
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/history');
        const data = await res.json();
        if (data.success) {
          setHistory(data.history);
          if (data.history.length > 0) {
            setCurrentAnalysis(data.history[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch scan logs:', err);
      }
    };

    // Ping /api/analyse with no file to query backend status (isMock)
    const checkBackend = async () => {
      try {
        const res = await fetch('/api/analyse', { method: 'POST' });
        const data = await res.json();
        if (data.isMock !== undefined) {
          setIsMock(data.isMock);
        }
      } catch (err) {
        setIsMock(true);
      }
    };

    getUserData();
    checkBackend();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    document.cookie = "blunlty_bypass=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    setUser(null);
    window.location.reload();
  };

  const handleAddHistory = (record) => {
    setHistory((prev) => [record, ...prev]);
    setCurrentAnalysis(record);
  };

  const handleSelectHistory = (record) => {
    setCurrentAnalysis(record);
    setActiveView('individual'); // Switch back to individual view to show candidate detail dashboard
  };

  return (
    <div className={`dashboard-layout polka-dot-bg ${sidebarCollapsed ? 'collapsed-sidebar' : ''}`}>
      {/* Sidebar Panel */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        theme={theme}
        toggleTheme={toggleTheme}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Main Workspace Frame */}
      <main className="main-frame flex-col">
        <Header 
          activeView={activeView} 
          setActiveView={setActiveView} 
          isMock={isMock} 
        />

        {/* View Router */}
        <div className="view-content flex-1">
          {activeView === 'individual' && (
            <IndividualView 
              onAddHistory={handleAddHistory} 
              selectedAnalysis={currentAnalysis}
            />
          )}

          {activeView === 'batch' && (
            <BatchView onAddHistory={handleAddHistory} />
          )}

          {activeView === 'settings' && (
            <div className="settings-panel p-6 flex-col gap-6">
              <div className="card flex-col gap-4 max-w-2xl">
                <h2 className="settings-title font-sans flex align-center gap-2">
                  <SettingsIcon size={22} /> System Configuration
                </h2>
                
                <div className="settings-info flex-col gap-2 pt-2">
                  <h3 className="settings-subtitle font-sans">API Key Setup</h3>
                  <p className="settings-desc font-sans">
                    By default, blunlty runs in <strong>Fallback Mock Mode</strong> using a local parser and simulation system.
                  </p>
                  <p className="settings-desc font-sans">
                    To connect to the live Google Gemini AI, create a <code>.env.local</code> file at the root of your project directory and add your Google AI API key:
                  </p>
                  <pre className="env-code font-mono">
                    GEMINI_API_KEY=your_google_ai_api_key_here
                  </pre>
                  <p className="settings-desc font-sans mt-2">
                    After adding the environment variables, restart your Next.js development server to activate the live model:
                  </p>
                  <pre className="env-code font-mono">
                    npm run dev
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right Overview Panel */}
      <RightPanel
        history={history}
        onSelectHistory={handleSelectHistory}
        currentAnalysisId={currentAnalysis?.id}
      />

      <style jsx>{`
        .main-frame {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0; /* Prevents overflow issues with flex children */
          min-height: 100vh;
        }

        .view-content {
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .settings-panel {
          padding: 2rem;
        }

        .settings-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }

        .settings-subtitle {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .settings-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .env-code {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.75rem;
          font-size: 0.8rem;
          color: var(--secondary);
          overflow-x: auto;
        }

        .mt-2 {
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}
