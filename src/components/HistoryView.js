'use client';

import { useState } from 'react';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, HistoryIcon } from './Icons';

export default function HistoryView({ history = [], onSelectHistory }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getFilteredAndSortedHistory = () => {
    // 1. Filter
    const filtered = history.filter(item => {
      const candidate = item.analysis?.candidateName || '';
      const filename = item.filename || '';
      const query = searchQuery.toLowerCase();
      return candidate.toLowerCase().includes(query) || filename.toLowerCase().includes(query);
    });

    // 2. Sort
    return filtered.sort((a, b) => {
      let valA, valB;
      if (sortField === 'name') {
        valA = (a.analysis?.candidateName || '').toLowerCase();
        valB = (b.analysis?.candidateName || '').toLowerCase();
      } else if (sortField === 'atsScore') {
        valA = a.analysis?.atsScore ?? -1;
        valB = b.analysis?.atsScore ?? -1;
      } else if (sortField === 'qualityScore') {
        valA = a.analysis?.qualityScore ?? -1;
        valB = b.analysis?.qualityScore ?? -1;
      } else {
        // Default: Sort by ID or Timestamp/Index (assume history is ordered chronologically)
        valA = a.id || '';
        valB = b.id || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedHistory = getFilteredAndSortedHistory();

  return (
    <div className="history-panel flex-col gap-6 fade-in">
      {/* Header card for title & summary */}
      <div className="card">
        <h2 className="card-title flex align-center gap-3">
          <HistoryIcon size={20} />
          Scan History Log
        </h2>
        <div className="card-divider"></div>
        <div className="flex justify-between align-center flex-wrap gap-4">
          <p className="font-sans text-secondary" style={{ fontSize: '14px' }}>
            Browse and access previous scans. A total of <strong>{history.length}</strong> resumes have been parsed in this session.
          </p>
          
          {/* Search Box */}
          <div className="search-box-container">
            <span className="search-icon"><SearchIcon size={16} /></span>
            <input
              type="text"
              className="input-text search-input"
              placeholder="Search by candidate name or file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      {sortedHistory.length === 0 ? (
        <div className="card align-center justify-center p-8 text-center" style={{ minHeight: '200px' }}>
          <p className="font-sans text-secondary">No matching scans found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>#</th>
                <th className="sortable" onClick={() => handleSort('name')}>
                  <div className="flex align-center gap-1">
                    Candidate Name
                    {sortField === 'name' && (sortOrder === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)}
                  </div>
                </th>
                <th>Resume Filename</th>
                <th className="sortable text-center" onClick={() => handleSort('atsScore')}>
                  <div className="flex align-center justify-center gap-1" style={{ width: '100%' }}>
                    ATS Score
                    {sortField === 'atsScore' && (sortOrder === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)}
                  </div>
                </th>
                <th className="sortable text-center" onClick={() => handleSort('qualityScore')}>
                  <div className="flex align-center justify-center gap-1" style={{ width: '100%' }}>
                    Resume Quality
                    {sortField === 'qualityScore' && (sortOrder === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)}
                  </div>
                </th>
                <th>Timestamp</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.map((item, index) => {
                const score = item.analysis?.atsScore ?? item.analysis?.qualityScore ?? 0;
                const formattedTime = item.timestamp || 'N/A';
                
                return (
                  <tr key={`${item.id || 'item'}-${index}`}>
                    <td style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>{index + 1}</td>
                    <td style={{ fontWeight: '600' }}>{item.analysis?.candidateName || 'N/A'}</td>
                    <td className="font-mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {item.filename}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        className="tag" 
                        style={{ 
                          backgroundColor: score >= 80 ? 'var(--success-subtle)' : score >= 65 ? 'var(--warning-subtle)' : 'var(--danger-subtle)',
                          color: score >= 80 ? 'var(--success)' : score >= 65 ? 'var(--warning)' : 'var(--danger)',
                          fontWeight: '700'
                        }}
                      >
                        {item.analysis?.atsScore !== null && item.analysis?.atsScore !== undefined ? `${item.analysis.atsScore}%` : 'N/A'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        className="tag" 
                        style={{ 
                          backgroundColor: item.analysis?.qualityScore >= 80 ? 'var(--success-subtle)' : item.analysis?.qualityScore >= 65 ? 'var(--warning-subtle)' : 'var(--danger-subtle)',
                          color: item.analysis?.qualityScore >= 80 ? 'var(--success)' : item.analysis?.qualityScore >= 65 ? 'var(--warning)' : 'var(--danger)',
                          fontWeight: '700'
                        }}
                      >
                        {item.analysis?.qualityScore !== undefined ? `${item.analysis.qualityScore}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="font-sans text-secondary" style={{ fontSize: '13px' }}>
                      {formattedTime}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => onSelectHistory(item)}
                        className="button-secondary" 
                        style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .history-panel {
          width: 100%;
        }

        .search-box-container {
          position: relative;
          width: 300px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .search-input {
          padding-left: 36px !important;
          width: 100%;
        }

        @media (max-width: 640px) {
          .search-box-container {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
