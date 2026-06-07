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
    const savedTheme = localStorage.getItem('theme') || 'light';
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
          let historyData = data.history;
          if (historyData.length === 0) {
            // Seed a default mock record matching the reference mockup
            const defaultMock = {
              id: 'mock-default-id',
              filename: 'Google Step Internship.pdf',
              timestamp: 'May 14, 2025 at 10:30 AM',
              analysis: {
                candidateName: 'Google Step Internship.pdf',
                atsScore: 37,
                qualityScore: 70,
                jobDescription: 'Software Engineering Intern',
                skills: {
                  matched: ['React.js', 'JavaScript', 'HTML', 'CSS', 'Node.js', 'Git', 'GitHub', 'REST API'],
                  missing: ['Next.js', 'TypeScript', 'Tailwind CSS', 'GraphQL', 'AWS', 'Docker', 'CI/CD', 'Jest']
                },
                sections: {
                  experience: 30,
                  education: 90,
                  skills: 80,
                  formatting: 100,
                  impact: 55
                },
                feedback: {
                  summary: 'The resume shows a decent alignment with the Software Engineering Intern role. The candidate has relevant skills and education, but the experience section lacks depth and measurable impact. Improving keyword usage and adding more quantifiable achievements will significantly boost the ATS score.',
                  strengths: [
                    "Good foundation of industry experience with a clear career progression.",
                    "Clear section separation and structural layout."
                  ],
                  improvements: [
                    "Quantify achievements: include metrics, scale, or percentage improvements in role descriptions.",
                    "Tailor bullet points to explicitly match technologies requested in target job descriptions."
                  ],
                  wordingImprovements: [
                    "Collaborated with cross-functional teams to design, develop, and deploy features.",
                    "Utilized modern tools and frameworks to optimize workflow efficiency and code quality."
                  ],
                  careerAdvice: 'To progress to more senior positions, aim to lead projects or design architectures. Document those scale and design contributions clearly in your project listings.'
                },
                ruleViolations: ['No skills section'],
                passedRules: ['Email Address', 'Phone Number', 'Resume Length (1-2 pages)', 'Section Headings'],
                experienceMatch: null
              }
            };
            historyData = [defaultMock];
          }
          setHistory(historyData);
          if (historyData.length > 0) {
            setCurrentAnalysis(historyData[0]);
            // If the user is starting with the mock record, navigate directly to the analysis view
            if (historyData[0].id === 'mock-default-id') {
              setIndividualSection('analysis');
            }
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
              activeSection={individualSection}
              setActiveSection={setIndividualSection}
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
