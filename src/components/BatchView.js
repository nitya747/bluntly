'use client';

import { useState } from 'react';
import { 
  UploadIcon, 
  TrashIcon, 
  SparklesIcon, 
  SettingsIcon, 
  ChartIcon, 
  AlertIcon, 
  ClockIcon, 
  BotIcon, 
  CheckIcon, 
  XIcon, 
  DownloadIcon, 
  ChevronUpIcon, 
  ChevronDownIcon,
  FileTextIcon
} from './Icons';

export default function BatchView({ onAddHistory, credits, setCredits, history = [] }) {
  const [files, setFiles] = useState([]);
  const [jobDescription, setJobDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progressLog, setProgressLog] = useState([]);
  const [results, setResults] = useState([]);
  const [recentBatchJobs, setRecentBatchJobs] = useState([]);
  
  // Filtering & Sorting
  const [sortField, setSortField] = useState('atsScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [minScore, setMinScore] = useState(0);
  const [skillFilter, setSkillFilter] = useState('');

  const [expandedIndex, setExpandedIndex] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeSection, setActiveSection] = useState('input'); // 'input' (Configure) or 'analysis' (Analysis Report)

  const loadSampleJD = () => {
    setJobDescription(
      "Looking for a Senior Software Engineer with experience in React, Next.js, and TypeScript. Skills in Custom CSS, Tailwind, and REST APIs are a plus."
    );
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    validateAndAddFiles(droppedFiles);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    validateAndAddFiles(selectedFiles);
  };

  const validateAndAddFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      return ext === 'pdf' || ext === 'tex' || ext === 'txt';
    });

    if (validFiles.length !== newFiles.length) {
      setError('Some files were skipped. Only PDF (.pdf) and LaTeX (.tex) formats are supported.');
    } else {
      setError(null);
    }

    const updatedFiles = [...files, ...validFiles].slice(0, 20);
    setFiles(updatedFiles);
  };

  const removeFile = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setError(null);
  };

  const runBatchAnalysis = async () => {
    if (files.length === 0) return;

    setProcessing(true);
    setError(null);
    setResults([]);
    setExpandedIndex(null);
    setActiveSection('analysis');

    // Initialize progress logs
    const initialLogs = files.map((file, idx) => ({
      index: idx,
      name: file.name,
      status: 'queued',
      error: null,
    }));
    setProgressLog(initialLogs);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start batch analysis.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;

            try {
              const eventData = JSON.parse(dataStr);
              handleSSEEvent(eventData);
            } catch (err) {
              console.error('Error parsing SSE event line:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during batch processing.');
      setProcessing(false);
    }
  };

  const handleSSEEvent = (eventData) => {
    const { event, index, status, result, error, results: finalResults, credits: sseCredits } = eventData;

    if (sseCredits !== undefined) {
      setCredits(sseCredits);
    }

    if (event === 'progress') {
      setProgressLog(prev => 
        prev.map(log => 
          log.index === index 
            ? { ...log, status, error: error || null, result: result || null }
            : log
        )
      );
    } else if (event === 'complete') {
      setProcessing(false);
      
      const formattedResults = finalResults.map((res, rankIdx) => ({
        id: res.id || Math.random().toString(36).substr(2, 9),
        filename: res.filename,
        success: res.success,
        error: res.error || null,
        analysis: res.analysis || null,
      })).filter(res => res.success);

      setResults(formattedResults);

      const avgATS = formattedResults.length > 0 
        ? Math.round(formattedResults.reduce((acc, r) => acc + (r.analysis?.atsScore || 0), 0) / formattedResults.length)
        : 0;

      const newJob = {
        timestamp: new Date().toLocaleTimeString(),
        candidateCount: formattedResults.length,
        avgATS,
        jobSnippet: jobDescription ? jobDescription.substring(0, 40) + '...' : 'General Analysis',
        rawResults: formattedResults
      };
      setRecentBatchJobs(prev => [newJob, ...prev]);

      formattedResults.forEach(res => {
        onAddHistory({
          id: res.id,
          filename: res.filename,
          analysis: {
            ...res.analysis,
            jobDescription: jobDescription
          },
          timestamp: res.analysis.timestamp || new Date().toLocaleTimeString(),
        });
      });
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getFilteredAndSortedResults = () => {
    const filtered = results.filter(res => {
      const score = res.analysis?.atsScore ?? 0;
      if (score < minScore) return false;
      if (skillFilter.trim() !== '') {
        const skillsList = (res.analysis?.skills?.matched || []).map(s => s.toLowerCase());
        const searchTerms = skillFilter.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        const hasAllSkills = searchTerms.every(term => 
          skillsList.some(s => s.includes(term))
        );
        if (!hasAllSkills) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      let valA, valB;

      if (sortField === 'name') {
        valA = (a.analysis?.candidateName || '').toLowerCase();
        valB = (b.analysis?.candidateName || '').toLowerCase();
      } else if (sortField === 'format') {
        valA = a.filename.split('.').pop().toLowerCase();
        valB = b.filename.split('.').pop().toLowerCase();
      } else if (sortField === 'atsScore') {
        valA = a.analysis?.atsScore ?? 0;
        valB = b.analysis?.atsScore ?? 0;
      } else if (sortField === 'qualityScore') {
        valA = a.analysis?.qualityScore ?? 0;
        valB = b.analysis?.qualityScore ?? 0;
      } else {
        return 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const toggleRowExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const loadRecentBatchJob = (job) => {
    setResults(job.rawResults);
    setActiveSection('analysis');
    setExpandedIndex(null);
  };

  const getJobTitle = (scan) => {
    const jd = scan?.analysis?.jobDescription || jobDescription || '';
    if (jd) {
      const match = jd.match(/(?:looking for a|position:|role:|job title:)\s*([a-zA-Z\s\+\#]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
      const firstWords = jd.split(/\s+/).slice(0, 3).join(' ');
      if (firstWords) return firstWords;
    }
    return 'Software Developer';
  };

  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = ['Rank', 'Candidate Name', 'File Name', 'Format', 'ATS Score (%)', 'Quality Score (%)', 'Top Skills'];
    const sorted = getFilteredAndSortedResults();
    const rows = sorted.map((res, idx) => {
      const extension = res.filename.split('.').pop().toUpperCase();
      const topSkills = res.analysis?.skills?.matched?.slice(0, 3).join(', ') || 'None';
      return [
        idx + 1,
        `"${res.analysis?.candidateName || 'N/A'}"`,
        `"${res.filename}"`,
        extension,
        res.analysis?.atsScore !== null ? res.analysis?.atsScore : 'N/A',
        res.analysis?.qualityScore || 0,
        `"${topSkills}"`
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    downloadFile(csvContent, 'resume_ranking_report.csv', 'text/csv;charset=utf-8;');
  };

  const exportJSON = () => {
    if (results.length === 0) return;
    const sorted = getFilteredAndSortedResults();
    const jsonString = JSON.stringify(sorted, null, 2);
    downloadFile(jsonString, 'resume_ranking_report.json', 'application/json;charset=utf-8;');
  };

  const exportPDF = () => {
    window.print();
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const completedCount = progressLog.filter(l => l.status === 'completed' || l.status === 'error').length;
  const totalCount = progressLog.length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredResults = getFilteredAndSortedResults();
  const totalResumes = filteredResults.length;
  const avgATS = totalResumes > 0 
    ? Math.round(filteredResults.reduce((acc, r) => acc + (r.analysis?.atsScore || 0), 0) / totalResumes)
    : 0;
  const highestATS = totalResumes > 0 ? Math.max(...filteredResults.map(r => r.analysis?.atsScore || 0)) : 0;
  const lowestATS = totalResumes > 0 ? Math.min(...filteredResults.map(r => r.analysis?.atsScore || 0)) : 0;

  const getProgressColorClass = (score) => {
    if (score >= 80) return 'success';
    if (score >= 65) return 'warning';
    return 'danger';
  };

  const getStatusLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Good Match';
    return 'Needs Review';
  };

  return (
    <div className="workspace flex-col gap-6 fade-in">
      {/* 1. Configure Screen Pattern */}
      {activeSection === 'input' && (
        <div className="flex-col gap-8 fade-in">
          <div className="grid grid-cols-2 gap-8">
            {/* Multi File Upload Card */}
            <div className="card">
              <div className="flex justify-between align-center">
                <h3 className="card-title">Resumes Batch</h3>
                {files.length > 0 && (
                  <button onClick={clearAllFiles} className="button-secondary sample-btn flex align-center gap-2">
                    <TrashIcon size={13} />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
              <div className="card-divider"></div>
              
              <div 
                className={`dropzone-area flex-col align-center justify-center gap-3 ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  onChange={handleFileChange} 
                  accept=".pdf,.tex,.txt" 
                  multiple 
                  id="batch-file-input"
                  style={{ display: 'none' }}
                />
                
                {files.length === 0 ? (
                  <label htmlFor="batch-file-input" className="upload-box flex-col align-center justify-center gap-3 cursor-pointer">
                    <div className="upload-icon-wrapper flex align-center justify-center">
                      <UploadIcon size={24} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div className="flex-col align-center text-center">
                      <span className="upload-title">Upload Resume Batch</span>
                      <span className="upload-desc">Drag & drop or click to browse</span>
                      <span className="upload-note font-mono">Select up to 20 PDF, LaTeX or Text files</span>
                    </div>
                  </label>
                ) : (
                  <div className="batch-files-list flex-col w-full h-full p-2" style={{ overflowY: 'auto' }}>
                    <span className="font-sans font-bold text-secondary" style={{ fontSize: '13px', display: 'block', marginBottom: '8px', textAlign: 'left' }}>
                      {files.length} files selected:
                    </span>
                    <div className="flex flex-col gap-2">
                      {files.map((f, i) => (
                        <div key={i} className="file-row flex align-center justify-between" style={{
                          backgroundColor: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px'
                        }}>
                          <span className="truncate font-sans" style={{ maxWidth: '80%', fontWeight: '600' }}>{f.name}</span>
                          <button onClick={() => removeFile(i)} className="remove-btn">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Job Description Card */}
            <div className="card">
              <div className="flex justify-between align-center">
                <h3 className="card-title">Job Description</h3>
                <button onClick={loadSampleJD} className="button-secondary sample-btn flex align-center gap-2">
                  <SparklesIcon size={13} />
                  <span>Sample JD</span>
                </button>
              </div>
              <div className="card-divider"></div>
              
              <div className="flex-col gap-3 h-full">
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste target job requirements here to calculate ATS compatibility score..."
                  className="textarea-text jd-textarea"
                />
                <div className="jd-stats flex justify-between font-mono">
                  <span>{jobDescription.split(/\s+/).filter(Boolean).length} words</span>
                  <span>{jobDescription.length} chars</span>
                </div>
              </div>
            </div>
          </div>

          {/* Credit warnings */}
          {files.length > 0 && credits < files.length && (
            <div className="credit-warning-banner card flex align-center gap-3" style={{ alignSelf: 'center', maxWidth: '500px', width: '100%', borderColor: 'var(--danger)', backgroundColor: 'rgba(239,68,68,0.06)', color: 'var(--danger)' }}>
              <span className="error-icon flex align-center">⚠️</span>
              <span className="error-message font-sans" style={{ fontSize: '13px' }}>
                Insufficient credits. This batch requires <strong>{files.length} credits</strong>, but you only have <strong>{credits} credits</strong> remaining. Please buy credits in the sidebar.
              </span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="error-banner flex align-center gap-3">
              <AlertIcon size={16} />
              <span className="error-text">{error}</span>
            </div>
          )}

          {/* Start button */}
          <div className="flex-col align-center gap-2" style={{ marginTop: '8px' }}>
            <button
              onClick={runBatchAnalysis}
              disabled={files.length === 0 || processing || credits < files.length}
              className="button-primary run-analysis-btn"
            >
              {processing ? (
                <>
                  <SettingsIcon size={16} className="spin-animation" style={{ marginRight: '8px' }} />
                  Processing Batch Scans...
                </>
              ) : (
                'Analyze Batch'
              )}
            </button>
            <span className="cost-subtext">
              {files.length > 0 
                ? `Costs ${files.length} credit${files.length > 1 ? 's' : ''} — You have ${credits} credits remaining`
                : `Costs 1 credit per resume — You have ${credits} credits remaining`}
            </span>
          </div>

          {/* Recent Batch Jobs Table */}
          <div className="card">
            <h3 className="card-title">Recent Batch Jobs</h3>
            <div className="card-divider"></div>
            {recentBatchJobs.length === 0 ? (
              <p className="font-sans text-secondary text-center py-4" style={{ fontSize: '14px' }}>
                No batch jobs run in this session.
              </p>
            ) : (
              <div className="table-container">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Run Time</th>
                      <th>Candidates Scanned</th>
                      <th>JD Focus</th>
                      <th>Avg ATS Score</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBatchJobs.map((job, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600' }}>{job.timestamp}</td>
                        <td className="font-mono">{job.candidateCount} Resumes</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{job.jobSnippet}</td>
                        <td>
                          <span className="tag tag-matched" style={{ backgroundColor: 'var(--success-subtle)', color: 'var(--success)', fontWeight: '700' }}>{job.avgATS}%</span>
                        </td>
                        <td>
                          <button
                            onClick={() => loadRecentBatchJob(job)}
                            className="button-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', fontWeight: '600' }}
                          >
                            View Job
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Analysis Report Screen Pattern */}
      {activeSection === 'analysis' && (
        <div className="flex-col gap-6 fade-in">
          {/* Section 1: Batch Status */}
          <div className="card text-left">
            <h3 className="card-title">Batch Progress</h3>
            <div className="card-divider"></div>
            <div className="flex-col gap-4">
              <div className="flex justify-between align-center font-sans" style={{ fontSize: '13px' }}>
                <span className="text-secondary">Processed: <strong>{completedCount} / {totalCount}</strong> candidates</span>
                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{percentComplete}% Complete</span>
              </div>
              <div className="progress-bar-track">
                <div 
                  className="progress-bar-fill primary" 
                  style={{ width: `${percentComplete}%` }}
                ></div>
              </div>

              {/* Progress Detail Logs grid */}
              {progressLog.length > 0 && (
                <div className="grid grid-cols-4 gap-3" style={{ maxHeight: '140px', overflowY: 'auto', marginTop: '8px' }}>
                  {progressLog.map((log) => (
                    <div key={log.index} className="flex-col gap-1 text-left" style={{
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '11px'
                    }}>
                      <span className="truncate font-bold" style={{ color: 'var(--text-primary)' }}>{log.name}</span>
                      <span className="font-mono text-secondary" style={{ textTransform: 'capitalize' }}>
                        {log.status === 'completed' ? '✓ Completed' : log.status === 'error' ? '✕ Failed' : log.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Summary Metrics (140px KPI cards) */}
          {results.length > 0 && (
            <div className="grid grid-cols-4 gap-6">
              {/* Total Resumes */}
              <div className="kpi-card">
                <div className="flex align-center justify-between">
                  <span className="kpi-title">Total Resumes</span>
                  <span className="tooltip-icon">ℹ️</span>
                </div>
                <span className="kpi-score">{totalResumes}</span>
                <span className="kpi-status">Candidates parsed</span>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill primary" style={{ width: '100%' }}></div>
                </div>
              </div>

              {/* Average ATS Score */}
              <div className="kpi-card">
                <div className="flex align-center justify-between">
                  <span className="kpi-title">Average ATS Match</span>
                  <span className="tooltip-icon">ℹ️</span>
                </div>
                <span className="kpi-score" style={{ color: avgATS >= 80 ? 'var(--success)' : avgATS >= 65 ? 'var(--warning)' : 'var(--danger)' }}>
                  {avgATS}%
                </span>
                <span className="kpi-status" style={{ color: avgATS >= 80 ? 'var(--success)' : avgATS >= 65 ? 'var(--warning)' : 'var(--danger)', fontWeight: '700' }}>
                  {getStatusLabel(avgATS)}
                </span>
                <div className="progress-bar-track" style={{ backgroundColor: 'rgba(148, 163, 184, 0.1)', height: '5px', borderRadius: '999px', overflow: 'hidden' }}>
                  <div className="progress-bar-fill" style={{ width: `${avgATS}%`, backgroundColor: avgATS >= 80 ? 'var(--success)' : avgATS >= 65 ? 'var(--warning)' : 'var(--danger)' }}></div>
                </div>
              </div>

              {/* Highest Score */}
              <div className="kpi-card">
                <div className="flex align-center justify-between">
                  <span className="kpi-title">Highest ATS Match</span>
                  <span className="tooltip-icon">ℹ️</span>
                </div>
                <span className="kpi-score" style={{ color: highestATS >= 80 ? 'var(--success)' : highestATS >= 65 ? 'var(--warning)' : 'var(--danger)' }}>
                  {highestATS}%
                </span>
                <span className="kpi-status" style={{ color: highestATS >= 80 ? 'var(--success)' : highestATS >= 65 ? 'var(--warning)' : 'var(--danger)', fontWeight: '700' }}>
                  Top Candidate
                </span>
                <div className="progress-bar-track" style={{ backgroundColor: 'rgba(148, 163, 184, 0.1)', height: '5px', borderRadius: '999px', overflow: 'hidden' }}>
                  <div className="progress-bar-fill" style={{ width: `${highestATS}%`, backgroundColor: highestATS >= 80 ? 'var(--success)' : highestATS >= 65 ? 'var(--warning)' : 'var(--danger)' }}></div>
                </div>
              </div>

              {/* Lowest Score */}
              <div className="kpi-card">
                <div className="flex align-center justify-between">
                  <span className="kpi-title">Lowest ATS Match</span>
                  <span className="tooltip-icon">ℹ️</span>
                </div>
                <span className="kpi-score" style={{ color: lowestATS >= 80 ? 'var(--success)' : lowestATS >= 65 ? 'var(--warning)' : 'var(--danger)' }}>
                  {lowestATS}%
                </span>
                <span className="kpi-status" style={{ color: lowestATS >= 80 ? 'var(--success)' : lowestATS >= 65 ? 'var(--warning)' : 'var(--danger)', fontWeight: '700' }}>
                  Floor Score
                </span>
                <div className="progress-bar-track" style={{ backgroundColor: 'rgba(148, 163, 184, 0.1)', height: '5px', borderRadius: '999px', overflow: 'hidden' }}>
                  <div className="progress-bar-fill" style={{ width: `${lowestATS}%`, backgroundColor: lowestATS >= 80 ? 'var(--success)' : lowestATS >= 65 ? 'var(--warning)' : 'var(--danger)' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Filters Toolbar */}
          {results.length > 0 && (
            <div className="card text-left">
              <h3 className="card-title">Filter Candidates</h3>
              <div className="card-divider"></div>
              <div className="flex align-center gap-6 flex-wrap" style={{ fontSize: '13px' }}>
                <div className="flex align-center gap-3">
                  <span className="text-secondary" style={{ fontWeight: '700' }}>Min Score:</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={minScore} 
                    onChange={(e) => setMinScore(Number(e.target.value))} 
                    style={{ cursor: 'pointer' }}
                  />
                  <span className="font-mono" style={{ fontWeight: '700', width: '30px' }}>{minScore}%</span>
                </div>

                <div className="flex align-center gap-3 flex-1" style={{ minWidth: '200px' }}>
                  <span className="text-secondary" style={{ fontWeight: '700' }}>Required Skill:</span>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="e.g. Next.js, Kubernetes..." 
                    value={skillFilter}
                    onChange={(e) => setSkillFilter(e.target.value)}
                    style={{ padding: '6px 12px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Ranked Candidates Table & Section 5: Exports */}
          {results.length > 0 && (
            <div className="flex-col gap-4">
              <div className="flex justify-between align-center">
                <h3 className="card-title" style={{ border: 'none', padding: '0' }}>
                  Ranked Candidate Match List
                  <span className="font-sans text-secondary" style={{ fontSize: '13px', fontWeight: '500', marginLeft: '8px' }}>
                    (Showing {filteredResults.length} of {results.length})
                  </span>
                </h3>
                
                {/* Export Buttons */}
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="button-secondary flex align-center gap-2" style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '8px', fontWeight: '600' }}>
                    <DownloadIcon size={12} />
                    <span>CSV</span>
                  </button>
                  <button onClick={exportJSON} className="button-secondary flex align-center gap-2" style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '8px', fontWeight: '600' }}>
                    <DownloadIcon size={12} />
                    <span>JSON</span>
                  </button>
                  <button onClick={exportPDF} className="button-secondary flex align-center gap-2" style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '8px', fontWeight: '600' }}>
                    <DownloadIcon size={12} />
                    <span>PDF</span>
                  </button>
                </div>
              </div>

              {/* Candidates Table */}
              <div className="table-container">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th className="sortable" onClick={() => handleSort('name')}>
                        <div className="flex align-center gap-1">
                          Candidate Name
                          {sortField === 'name' && (sortOrder === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />)}
                        </div>
                      </th>
                      <th>Resume Name</th>
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
                      <th>Top Matching Skills</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAndSortedResults().map((res, index) => {
                      const rank = index + 1;
                      const extension = res.filename.split('.').pop().toUpperCase();
                      const isExpanded = expandedIndex === index;
                      const score = res.analysis?.atsScore ?? res.analysis?.qualityScore ?? 0;

                      return (
                        <tr key={res.id} style={{ backgroundColor: isExpanded ? 'var(--bg)' : 'transparent' }}>
                          <td style={{ fontWeight: '700', color: rank <= 3 ? 'var(--primary)' : 'var(--text-secondary)' }}>
                            #{rank}
                          </td>
                          <td style={{ fontWeight: '700' }}>{res.analysis?.candidateName || 'N/A'}</td>
                          <td className="font-mono text-secondary" style={{ fontSize: '13px' }}>
                            <FileTextIcon size={14} style={{ color: '#EF4444', marginRight: '4px' }} />
                            {res.filename} <span style={{ opacity: 0.6 }}>({extension})</span>
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
                              {res.analysis?.atsScore !== null && res.analysis?.atsScore !== undefined ? `${res.analysis.atsScore}%` : 'N/A'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>
                            {res.analysis?.qualityScore}%
                          </td>
                          <td>
                            <div className="flex gap-1 flex-wrap">
                              {res.analysis?.skills?.matched?.slice(0, 3).map((s, i) => (
                                <span key={i} className="tag tag-matched" style={{ backgroundColor: 'var(--success-subtle)', color: 'var(--success)', fontWeight: '600', padding: '2px 8px', fontSize: '11px' }}>{s}</span>
                              )) || <span className="text-secondary font-sans" style={{ fontSize: '12px' }}>None</span>}
                            </div>
                          </td>
                          <td>
                            <button onClick={() => toggleRowExpand(index)} className="button-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', fontWeight: '600' }}>
                              {isExpanded ? 'Hide' : 'Report'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Accordion expand detail panel */}
              {expandedIndex !== null && getFilteredAndSortedResults()[expandedIndex] && (
                <div className="card fade-in text-left" style={{ borderColor: 'var(--primary)', marginTop: '8px' }}>
                  <div className="flex justify-between align-center">
                    <h4 className="font-primary" style={{ fontSize: '15px', fontWeight: '700' }}>
                      Detailed Report for: <strong>{getFilteredAndSortedResults()[expandedIndex].analysis?.candidateName}</strong>
                    </h4>
                    <button onClick={() => setExpandedIndex(null)} className="remove-btn">✕</button>
                  </div>
                  <div className="card-divider"></div>
                  
                  <div className="grid grid-cols-2 gap-8" style={{ fontSize: '13px' }}>
                    <div className="flex-col gap-3">
                      <div className="flex justify-around bg-primary-light" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>
                        <div className="flex-col align-center">
                          <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                            {getFilteredAndSortedResults()[expandedIndex].analysis?.atsScore}%
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>ATS Score</span>
                        </div>
                        <div className="flex-col align-center">
                          <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {getFilteredAndSortedResults()[expandedIndex].analysis?.qualityScore}%
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Quality Score</span>
                        </div>
                      </div>
                      <p className="text-secondary" style={{ lineHeight: '1.5', fontSize: '13px' }}>
                        {getFilteredAndSortedResults()[expandedIndex].analysis?.feedback?.summary}
                      </p>
                    </div>

                    <div className="flex-col gap-3">
                      <div className="flex-col gap-1">
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Strengths</span>
                        <ul style={{ listStyle: 'none', paddingLeft: '0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          {getFilteredAndSortedResults()[expandedIndex].analysis?.feedback?.strengths?.slice(0, 3).map((s, i) => (
                            <li key={i}>✓ {s}</li>
                          )) || <li>None</li>}
                        </ul>
                      </div>
                      <div className="flex-col gap-1" style={{ marginTop: '8px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Areas to Improve</span>
                        <ul style={{ listStyle: 'none', paddingLeft: '0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          {getFilteredAndSortedResults()[expandedIndex].analysis?.feedback?.improvements?.slice(0, 3).map((s, i) => (
                            <li key={i}>⚠ {s}</li>
                          )) || <li>None</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .workspace {
          width: 100%;
        }

        .step-num {
          background-color: var(--primary);
          color: #FFFFFF;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          margin-right: 8px;
        }

        .card-subtitle-desc {
          font-family: var(--font-secondary);
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: -8px;
          text-align: left;
        }

        .dropzone-area {
          border: 2px dashed var(--border);
          border-radius: var(--radius-card);
          height: 200px;
          transition: border-color var(--transition-speed) ease, background-color var(--transition-speed) ease;
        }

        .dropzone-area:hover, .dropzone-area.drag-over {
          border-color: var(--primary);
          background-color: var(--bg);
        }

        .upload-box {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .upload-icon-wrapper {
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 50%;
          width: 48px;
          height: 48px;
        }

        .upload-title {
          font-family: var(--font-primary);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .upload-desc {
          font-family: var(--font-secondary);
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .upload-note {
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.8;
          margin-top: 6px;
        }

        .remove-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
          transition: color var(--transition-speed) ease;
        }

        .remove-btn:hover {
          color: var(--danger);
        }

        .jd-textarea {
          flex: 1;
          min-height: 120px;
          resize: none;
          font-family: inherit;
        }

        .jd-stats {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .sample-btn {
          padding: 6px 12px !important;
          font-size: 12px !important;
          border-radius: 8px !important;
        }

        .error-banner {
          background-color: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: var(--radius-btn);
          align-self: center;
          max-width: 500px;
          width: 100%;
        }

        .error-text {
          font-family: var(--font-secondary);
          font-size: 13px;
          font-weight: 500;
        }

        .run-analysis-btn {
          width: 280px;
          padding: 14px;
          font-size: 15px;
        }

        .cost-subtext {
          font-family: var(--font-secondary);
          font-size: 12px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
