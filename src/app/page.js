'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import HistoryView from '../components/HistoryView';
import IndividualView from '../components/IndividualView';
import BatchView from '../components/BatchView';
import { createClient } from '../lib/supabase/client';
import { SettingsIcon } from '../components/Icons';

export default function Home() {
  const [activeView, setActiveView] = useState('individual');
  const [theme, setTheme] = useState('dark'); // Default to dark for premium aesthetic
  const [history, setHistory] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isMock, setIsMock] = useState(true);
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);

  const supabase = createClient();
  const router = useRouter();

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/credits');
      const data = await res.json();
      if (data.success) {
        setCredits(data.credits);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  };

  const handleBuyCredits = async () => {
    try {
      const res = await fetch('/api/credits', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCredits(data.credits);
      }
    } catch (err) {
      console.error('Failed to top up credits:', err);
    }
  };

  // Load theme, fetch user, and check AI backend status on mount
  useEffect(() => {
    let themeTimer;
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    themeTimer = setTimeout(() => {
      setTheme(savedTheme);
    }, 0);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Fetch user and session-based scans history
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchHistory();
        fetchCredits();
      } else {
        router.push('/login');
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

    return () => {
      if (themeTimer) clearTimeout(themeTimer);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
    router.refresh();
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
    <div className="dashboard-layout">
      {/* Sidebar Panel */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onSignOut={handleSignOut}
        credits={credits}
        onBuyCredits={handleBuyCredits}
      />

      {/* Main Workspace Frame */}
      <main className="main-frame flex-col">
        <Header 
          activeView={activeView} 
          isMock={isMock} 
        />

        {/* View Router */}
        <div className="view-content flex-1">
          {activeView === 'individual' && (
            <IndividualView 
              onAddHistory={handleAddHistory} 
              selectedAnalysis={currentAnalysis}
              credits={credits}
              setCredits={setCredits}
              history={history}
            />
          )}

          {activeView === 'batch' && (
            <BatchView 
              onAddHistory={handleAddHistory} 
              credits={credits}
              setCredits={setCredits}
              history={history}
            />
          )}

          {activeView === 'history' && (
            <HistoryView 
              history={history} 
              onSelectHistory={handleSelectHistory} 
            />
          )}

          {activeView === 'settings' && (
            <div className="settings-panel flex-col gap-6 fade-in">
              <div className="card max-w-2xl">
                <h2 className="card-title flex align-center gap-2">
                  <SettingsIcon size={20} /> System Configuration
                </h2>
                <div className="card-divider"></div>
                <div className="flex-col gap-4">
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
                  <p className="settings-desc font-sans">
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

      <style jsx>{`
        .settings-panel {
          width: 100%;
        }

        .settings-subtitle {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .settings-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .env-code {
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-btn);
          padding: 12px;
          font-size: 13px;
          color: var(--primary);
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
