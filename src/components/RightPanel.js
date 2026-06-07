'use client';

import { useState } from 'react';
import { SparklesIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

export default function RightPanel({ history = [], onSelectHistory, currentAnalysisId }) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Calculate average scores and stats
  const totalScans = history.length;
  const averageScore = totalScans > 0 
    ? Math.round(history.reduce((acc, curr) => acc + (curr.analysis.atsScore || curr.analysis.qualityScore || 0), 0) / totalScans) 
    : 0;

  const topMatch = history.length > 0
    ? [...history].sort((a, b) => (b.analysis.atsScore || 0) - (a.analysis.atsScore || 0))[0]
    : null;

  const tips = [
    {
      title: "Quantify Achievements",
      text: "Use metric-driven bullet points (e.g., \"increased sales by 30%\") instead of simple responsibility lists."
    },
    {
      title: "Standardize Formats",
      text: "Avoid text inside multi-column tables or text boxes; simple layouts parse better in ATS."
    },
    {
      title: "Keyword Optimization",
      text: "Adapt resume descriptions to mirror the phrasing found directly in the job post."
    }
  ];

  const currentTip = tips[totalScans % tips.length] || tips[0];

  return (
    <aside className="right-panel">
      {/* Panel Title */}
      <div className="section-header">
        <h2 className="section-title font-sans">Quick Analytics</h2>
      </div>

      {/* Unified Analytics Dashboard Card */}
      <div className="analytics-card card flex flex-col gap-4">
        {/* Horizontal Stats Row */}
        <div className="stats-row flex justify-around align-center">
          <div className="stat-item flex flex-col align-center text-center">
            <span className="stat-value font-mono">{totalScans}</span>
            <span className="stat-label font-sans">Total Resumes</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item flex flex-col align-center text-center">
            <span className="stat-value font-mono">{averageScore}%</span>
            <span className="stat-label font-sans">Average Score</span>
          </div>
        </div>

        {topMatch && (
          <div className="top-match-wrapper flex flex-col gap-3">
            <div className="card-divider"></div>
            {/* Top Match Section */}
            <div className="top-match-section flex flex-col gap-2">
              <div className="flex justify-between align-center">
                <span className="top-match-badge font-sans">Top Match</span>
                <span className="top-match-score font-mono">{topMatch.analysis.atsScore || topMatch.analysis.qualityScore}%</span>
              </div>
              <div className="top-match-details flex align-center gap-3">
                <div className="candidate-avatar flex align-center justify-center font-sans">
                  {topMatch.analysis.candidateName ? topMatch.analysis.candidateName.charAt(0) : 'C'}
                </div>
                <div className="flex flex-col text-left overflow-hidden flex-1">
                  <span className="candidate-name font-sans">{topMatch.analysis.candidateName}</span>
                  <span className="candidate-file font-mono" title={topMatch.filename}>{topMatch.filename}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History Log */}
      <div className="history-section flex flex-col gap-3">
        <button 
          onClick={() => setIsHistoryOpen(!isHistoryOpen)} 
          className="history-toggle flex align-center justify-between"
          aria-expanded={isHistoryOpen}
        >
          <h3 className="sub-title">Scan History</h3>
          <span className="toggle-icon flex align-center justify-center">
            {isHistoryOpen ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
          </span>
        </button>
        {isHistoryOpen && (
          history.length === 0 ? (
            <div className="empty-history flex align-center justify-center card">
              <span className="empty-text">No scans in this session.</span>
            </div>
          ) : (
            <div className="history-list flex-col gap-2">
              {history.map((item) => {
                const score = item.analysis.atsScore || item.analysis.qualityScore || 0;
                const isCurrent = currentAnalysisId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectHistory(item)}
                    className={`history-item flex align-center justify-between card ${isCurrent ? 'active' : ''}`}
                  >
                    <div className="flex-col text-left">
                      <span className="history-name">{item.analysis.candidateName}</span>
                      <span className="history-file font-mono">{item.filename}</span>
                    </div>
                    <span className={`history-score font-mono ${score >= 80 ? 'good' : score >= 65 ? 'avg' : 'low'}`}>
                      {score}%
                    </span>
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Dynamic Pro Tips Section */}
      <div className="tips-section card flex flex-col gap-2.5">
        <h3 className="tips-title font-sans">
          <SparklesIcon size={15} /> Pro Resume Tip
        </h3>
        <div className="tip-content">
          <strong className="tip-headline font-sans">{currentTip.title}:</strong>
          <p className="tip-body font-sans">{currentTip.text}</p>
        </div>
      </div>

      <style jsx>{`
        .right-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background-color: var(--bg);
          border-left: 1px solid var(--border);
          padding: 2rem 1.5rem;
          height: 100vh;
          position: sticky;
          top: 0;
          overflow-y: auto;
          width: 340px;
        }

        .section-header {
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.75rem;
        }

        .section-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .analytics-card {
          background: linear-gradient(135deg, var(--surface), rgba(20, 184, 166, 0.05));
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
        }

        .analytics-card:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 20px rgba(15, 118, 110, 0.08);
        }

        .stats-row {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 0.5rem 0;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }

        .stat-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--primary);
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .stat-divider {
          width: 1px;
          height: 36px;
          background-color: var(--border);
        }

        .card-divider {
          height: 1px;
          background-color: var(--border);
          margin: 0.25rem 0;
        }

        .top-match-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .top-match-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .top-match-badge {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .top-match-score {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--success);
          background-color: var(--success-subtle);
          padding: 0.15rem 0.5rem;
          border-radius: 6px;
        }

        .top-match-details {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .candidate-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          color: #FFFFFF;
          font-weight: 700;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: var(--shadow);
        }

        .candidate-name {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .candidate-file {
          font-size: 0.7rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 0.1rem;
        }

        .sub-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .history-toggle {
          background: transparent;
          border: none;
          padding: 0.25rem 0;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--text-primary);
          transition: color 0.2s ease;
        }

        .history-toggle:hover {
          color: var(--primary);
        }

        .toggle-icon {
          color: var(--text-secondary);
          transition: color 0.2s ease, transform 0.2s ease;
        }

        .history-toggle:hover .toggle-icon {
          color: var(--primary);
        }

        .empty-history {
          padding: 1.5rem;
          text-align: center;
        }

        .empty-text {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .history-list {
          max-height: 250px;
          overflow-y: auto;
          padding-right: 0.25rem;
        }

        .history-item {
          background: var(--surface);
          padding: 0.75rem 1rem;
          cursor: pointer;
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .history-item:hover {
          border-color: var(--primary);
          background: rgba(15, 118, 110, 0.05);
        }

        .history-item.active {
          border-color: var(--primary-hover);
          background: rgba(20, 184, 166, 0.05);
        }

        .history-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .history-file {
          font-size: 0.65rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        .history-score {
          font-size: 0.95rem;
          font-weight: 800;
        }

        .history-score.good { color: var(--success); }
        .history-score.avg { color: var(--warning); }
        .history-score.low { color: var(--danger); }

        .tips-section {
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.04), rgba(13, 148, 136, 0.02));
          border: 1px solid rgba(20, 184, 166, 0.15);
          border-left: 4px solid var(--primary);
          padding: 1rem 1.25rem;
          border-radius: 12px;
        }

        [data-theme="dark"] .tips-section {
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(13, 148, 136, 0.04));
          border: 1px solid rgba(20, 184, 166, 0.25);
          border-left: 4px solid var(--primary);
        }

        .tips-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--primary);
          display: flex;
          align-items: center;
        }

        [data-theme="dark"] .tips-title {
          color: var(--primary);
        }

        .tip-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .tip-headline {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .tip-body {
          font-size: 0.78rem;
          line-height: 1.4;
          color: var(--text-secondary);
        }

        @media (max-width: 1200px) {
          .right-panel {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
