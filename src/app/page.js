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
  const [individualSection, setIndividualSection] = useState('input'); // 'input' or 'analysis'
  const [batchSection, setBatchSection] = useState('input'); // 'input' or 'analysis'
  const [theme, setTheme] = useState('light'); // Default to light for matching the mockup
  const [history, setHistory] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isMock, setIsMock] = useState(true);
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [customApiKey, setCustomApiKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const isBYOKMode = user?.id === 'mock-dev-id' && !!customApiKey;

  // Load custom API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('bluntly_gemini_api_key') || '';
    setTimeout(() => {
      setCustomApiKey(savedKey);
      setKeyInput(savedKey);
    }, 0);
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem('bluntly_gemini_api_key', keyInput);
    setCustomApiKey(keyInput);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    checkBackend();
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('bluntly_gemini_api_key');
    setCustomApiKey('');
    setKeyInput('');
    checkBackend();
  };

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

  // Ping /api/analyse with no file to query backend status (isMock)
  const checkBackend = async () => {
    try {
      const localKey = localStorage.getItem('bluntly_gemini_api_key') || '';
      const headers = {};
      if (localKey) {
        headers['x-gemini-api-key'] = localKey;
      }
      const res = await fetch('/api/analyse', { 
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (data.isMock !== undefined) {
        setIsMock(data.isMock);
      }
    } catch (err) {
      setIsMock(true);
    }
  };

  // Load theme, fetch user, and check AI backend status on mount
  useEffect(() => {
    let themeTimer;
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    themeTimer = setTimeout(() => {
      setTheme(savedTheme);
    }, 0);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Fetch user and session-based scans history
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const isBypass = document.cookie.includes('bluntly_bypass=true');

      if (user) {
        setUser(user);
        fetchHistory();
        fetchCredits();
      } else if (isBypass) {
        setUser({ id: 'mock-dev-id', email: 'developer@bluntly.local' });
        setCredits(999);
        // Hydrate history from localStorage
        const savedHistory = localStorage.getItem('bluntly_local_history');
        if (savedHistory) {
          try {
            const parsedHistory = JSON.parse(savedHistory);
            setHistory(parsedHistory);
            if (parsedHistory.length > 0) {
              setCurrentAnalysis(parsedHistory[0]);
            }
          } catch (e) {
            console.error('Failed to parse local history:', e);
          }
        }
      } else {
        router.push('/login');
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/history');
        const data = await res.json();
        if (data.success) {
          const historyData = data.history;
          setHistory(historyData);
          if (historyData.length > 0) {
            setCurrentAnalysis(historyData[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch scan logs:', err);
      }
    };

    getUserData();
    checkBackend();

    return () => {
      if (themeTimer) clearTimeout(themeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleSignOut = async () => {
    document.cookie = "bluntly_bypass=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const handleAddHistory = (record) => {
    setHistory((prev) => {
      const updated = [record, ...prev];
      // Save local mode history to localStorage
      const isBypass = document.cookie.includes('bluntly_bypass=true');
      if (isBypass) {
        localStorage.setItem('bluntly_local_history', JSON.stringify(updated.slice(0, 50)));
      }
      return updated;
    });
    setCurrentAnalysis(record);
  };

  const handleSelectHistory = (record) => {
    setCurrentAnalysis(record);
    setActiveView('individual'); // Switch back to individual view to show candidate detail dashboard
    setIndividualSection('analysis'); // Force Report section open
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Panel */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        individualSection={individualSection}
        setIndividualSection={setIndividualSection}
        batchSection={batchSection}
        setBatchSection={setBatchSection}
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onSignOut={handleSignOut}
        credits={credits}
        onBuyCredits={handleBuyCredits}
        isBYOKMode={isBYOKMode}
      />

      {/* Main Workspace Frame */}
      <main className="main-frame flex-col">
        <Header 
          activeView={activeView} 
          setActiveView={setActiveView}
          individualSection={individualSection}
          setIndividualSection={setIndividualSection}
          batchSection={batchSection}
          setBatchSection={setBatchSection}
          isMock={isMock} 
          user={user}
          credits={credits}
          onBuyCredits={handleBuyCredits}
          onSignOut={handleSignOut}
          isBYOKMode={isBYOKMode}
        />

        {/* View Router */}
        <div className="view-content flex-1">
          {activeView === 'individual' && (
            <IndividualView 
              onAddHistory={handleAddHistory} 
              selectedAnalysis={currentAnalysis}
              onClearAnalysis={() => setCurrentAnalysis(null)}
              credits={credits}
              setCredits={setCredits}
              history={history}
              activeSection={individualSection}
              setActiveSection={setIndividualSection}
              setActiveView={setActiveView}
              isBYOKMode={isBYOKMode}
            />
          )}

          {activeView === 'batch' && (
            <BatchView 
              onAddHistory={handleAddHistory} 
              credits={credits}
              setCredits={setCredits}
              history={history}
              activeSection={batchSection}
              setActiveSection={setBatchSection}
              isBYOKMode={isBYOKMode}
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
                
                {/* Configuration Status Card */}
                <div className="status-container flex-col gap-3 p-4" style={{ 
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg)'
                }}>
                  <div className="flex align-center justify-between">
                    <span className="font-sans font-bold" style={{ fontSize: '14px', color: 'var(--text-primary)' }}>AI Processing Mode</span>
                    {customApiKey ? (
                      <span className="ai-status-badge live">
                        <span className="status-dot"></span> Browser Key Active
                      </span>
                    ) : !isMock ? (
                      <span className="ai-status-badge live" style={{ color: 'var(--primary)', borderColor: 'rgba(15,118,110,0.2)' }}>
                        <span className="status-dot" style={{ backgroundColor: 'var(--primary)' }}></span> Server Key Active
                      </span>
                    ) : (
                      <span className="ai-status-badge mock">
                        <span className="status-dot"></span> Mock Fallback Active
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-secondary" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                    {customApiKey ? (
                      "All resume processing and job description analysis will be executed live using your personal API key stored securely in this browser."
                    ) : !isMock ? (
                      "The server is configured with a host-provided Gemini API key. Analysis requests will be executed using the host credentials."
                    ) : (
                      "The system is currently running in Fallback Mock Mode. Resume parsing, skill extraction, and evaluation scores will use local heuristics and simulation. Paste your API key below to unlock live Google Gemini AI."
                    )}
                  </p>
                </div>

                {/* Input Fields */}
                <div className="flex-col gap-4" style={{ marginTop: '8px' }}>
                  <h3 className="settings-subtitle font-sans">Personal API Key Setup (BYOK)</h3>
                  <p className="settings-desc font-sans">
                    Paste your personal Gemini API key here. It is saved client-side in your local storage, and sent via HTTPS headers.
                  </p>
                  
                  <div className="flex-col gap-2">
                    <div className="flex align-center justify-between">
                      <label className="font-sans font-semibold text-secondary" style={{ fontSize: '12px' }}>Google Gemini API Key</label>
                      <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{
                        fontSize: '12px',
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        fontWeight: '600'
                      }}>Get a free key from Google AI Studio →</a>
                    </div>
                    
                    <div className="flex gap-2" style={{ position: 'relative', width: '100%' }}>
                      <div className="input-container flex-1" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={keyInput}
                          onChange={(e) => setKeyInput(e.target.value)}
                          placeholder="AIzaSy..."
                          className="input-text font-sans"
                          style={{ paddingRight: '40px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.6
                          }}
                        >
                          {showKey ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3" style={{ marginTop: '4px' }}>
                    <button
                      onClick={handleSaveApiKey}
                      disabled={!keyInput.trim()}
                      className="button-primary"
                      style={{ padding: '10px 16px', borderRadius: '10px' }}
                    >
                      {saveSuccess ? (
                        <span className="flex align-center gap-2">✓ Key Saved</span>
                      ) : (
                        <span>Save API Key</span>
                      )}
                    </button>
                    {customApiKey && (
                      <button
                        onClick={handleClearApiKey}
                        className="button-secondary"
                        style={{ padding: '10px 16px', borderRadius: '10px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                      >
                        Delete Key
                      </button>
                    )}
                  </div>
                </div>

                <div className="card-divider" style={{ margin: '12px 0' }}></div>

                <div className="flex-col gap-3">
                  <h3 className="settings-subtitle font-sans">Self-Hosted Server Config</h3>
                  <p className="settings-desc font-sans">
                    To make an API key default for all users of this server instance, configure the environment variable:
                  </p>
                  <pre className="env-code font-mono">
                    GEMINI_API_KEY=your_key_here
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

// Local SVG Icons for page.js
function EyeIcon({ size = 16, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ size = 16, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
