'use client';

import { UserIcon, UsersIcon, BotIcon, AlertIcon } from './Icons';

export default function Header({ activeView, setActiveView, isMock }) {
  return (
    <header className="header flex align-center justify-between">
      {/* Title & Status */}
      <div className="title-section flex align-center gap-4">
        <h1 className="heading-primary font-sans">
          {activeView === 'individual' ? 'Single Resume Matcher' : 
           activeView === 'batch' ? 'Batch Resume Matcher & Ranker' : 
           activeView === 'settings' ? 'System Settings' : 'Dashboard'}
        </h1>

        {/* AI Mode Badge */}
        <div className={`ai-badge flex align-center gap-2 ${isMock ? 'mock' : 'gemini'}`}>
          <span className="dot"></span>
          <span className="label font-mono flex align-center gap-1.5" style={{ display: 'inline-flex', alignItems: 'center' }}>
            {isMock ? (
              <>
                <AlertIcon size={12} /> MOCK BACKEND
              </>
            ) : (
              <>
                <BotIcon size={12} /> GEMINI ACTIVE
              </>
            )}
          </span>
        </div>
      </div>

      {/* Mode Selector Pill Toggle */}
      {(activeView === 'individual' || activeView === 'batch') && (
        <div className="view-selector-pill flex">
          <button
            onClick={() => setActiveView('individual')}
            className={`select-btn flex align-center gap-1.5 ${activeView === 'individual' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <UserIcon size={14} /> Single
          </button>
          <button
            onClick={() => setActiveView('batch')}
            className={`select-btn flex align-center gap-1.5 ${activeView === 'batch' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <UsersIcon size={14} /> Batch
          </button>
        </div>
      )}

      <style jsx>{`
        .header {
          background-color: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          padding: 1.25rem 2rem;
          position: sticky;
          top: 0;
          z-index: 90;
        }

        .title-section {
          flex-wrap: wrap;
        }

        .ai-badge {
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.35rem 0.75rem;
          letter-spacing: 0.05em;
          border: 1px solid transparent;
        }

        .ai-badge.mock {
          background-color: var(--warning-bg);
          color: var(--warning);
          border-color: rgba(245, 158, 11, 0.2);
        }

        .ai-badge.gemini {
          background-color: var(--success-bg);
          color: var(--success);
          border-color: rgba(52, 211, 153, 0.2);
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 1.5s infinite ease-in-out;
        }

        .ai-badge.mock .dot {
          background-color: var(--warning);
        }

        .ai-badge.gemini .dot {
          background-color: var(--success);
        }

        .view-selector-pill {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 9999px;
          padding: 0.25rem;
        }

        .select-btn {
          background: transparent;
          border: none;
          border-radius: 9999px;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.4rem 1.2rem;
          transition: all 0.2s ease;
        }

        .select-btn.active {
          background-color: var(--bg-secondary);
          color: var(--primary);
          box-shadow: var(--shadow-sm);
        }

        @keyframes pulse {
          0% {
            transform: scale(0.9);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(0.9);
            opacity: 0.6;
          }
        }

        @media (max-width: 640px) {
          .header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
            padding: 1rem;
          }
          .view-selector-pill {
            width: 100%;
            display: flex;
          }
          .select-btn {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </header>
  );
}
