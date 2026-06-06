'use client';

import { BotIcon, AlertIcon } from './Icons';

export default function Header({ activeView, isMock }) {
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

  return (
    <header className="header flex align-center justify-between">
      {/* Title */}
      <h1 className="header-title">{getTitle()}</h1>

      {/* Outlined AI Mode Badge */}
      <div className={`ai-status-badge ${isMock ? 'mock' : 'live'}`}>
        <span className="status-dot"></span>
        <span className="status-label flex align-center gap-2">
          {isMock ? (
            <>
              <AlertIcon size={12} />
              <span>Mock Backend</span>
            </>
          ) : (
            <>
              <BotIcon size={12} />
              <span>Gemini Active</span>
            </>
          )}
        </span>
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
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .status-label {
          display: inline-flex;
          align-items: center;
        }

        @media (max-width: 640px) {
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
