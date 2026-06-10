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
  FileTextIcon,
  ConfigureIcon,
  UsersIcon
} from './Icons';

export default function BatchView({ 
  onAddHistory, 
  credits, 
  setCredits, 
  history = [],
  activeSection,
  setActiveSection,
  isBYOKMode = false
}) {
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
  
  // Comparison & Benchmarking State
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);
  const [showCompareDrawer, setShowCompareDrawer] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

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
      return ext === 'pdf' || ext === 'tex' || ext === 'txt' || ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp';
    });

    if (validFiles.length !== newFiles.length) {
      setError('Some files were skipped. Only PDF (.pdf), LaTeX (.tex), Text (.txt), and Image (.png, .jpg, .jpeg, .webp) formats are supported.');
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
    setIsQuotaExceeded(false);
    setExpandedIndex(null);
    setSelectedCompareIds([]);
    setShowCompareDrawer(false);
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

    const localKey = typeof window !== 'undefined' ? localStorage.getItem('bluntly_gemini_api_key') || '' : '';
    const headers = {};
    if (localKey) {
      headers['x-gemini-api-key'] = localKey;
    }

    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: headers,
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
      setIsQuotaExceeded(eventData.isQuotaExceeded || false);
      
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
        const skillsList = [
          ...(res.analysis?.skills?.matched || []),
          ...(res.analysis?.skills?.detected || [])
        ].map(s => s.toLowerCase());
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

  const handleSelectCompare = (id) => {
    if (selectedCompareIds.includes(id)) {
      setSelectedCompareIds(selectedCompareIds.filter(x => x !== id));
    } else {
      if (selectedCompareIds.length >= 3) {
        setError("You can compare up to 3 candidates at a time.");
        return;
      }
      setError(null);
      setSelectedCompareIds([...selectedCompareIds, id]);
    }
  };

  const loadRecentBatchJob = (job) => {
    setSelectedCompareIds([]);
    setShowCompareDrawer(false);
    setResults(job.rawResults);
    setActiveSection('analysis');
    setExpandedIndex(null);
    setIsQuotaExceeded(job.rawResults.some(r => r.analysis?.isQuotaExceeded || false));
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
                  accept=".pdf,.tex,.txt,.png,.jpg,.jpeg,.webp" 
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
                      <span className="upload-note font-mono">Select up to 20 PDF, LaTeX, Text or Image files</span>
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
          {files.length > 0 && credits < files.length && !isBYOKMode && (
            <div className="credit-warning-banner card flex align-center gap-3" style={{ alignSelf: 'center', maxWidth: '500px', width: '100%', borderColor: 'var(--danger)', backgroundColor: 'rgba(239,68,68,0.06)', color: 'var(--danger)' }}>
              <span className="error-icon flex align-center"><AlertIcon size={16} /></span>
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
              disabled={files.length === 0 || processing || (credits < files.length && !isBYOKMode)}
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
              {isBYOKMode
                ? 'Runs on your custom Gemini API key'
                : files.length > 0 
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
                      <th style={{ textAlign: 'center' }}>Action</th>
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
                        <td style={{ textAlign: 'center' }}>
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
      {activeSection === 'analysis' && results.length === 0 && !processing && (
        <div className="card flex-col align-center justify-center gap-4 text-center py-12 fade-in" style={{ minHeight: '400px', backgroundColor: 'transparent', width: '100%' }}>
          <div className="file-icon-wrapper flex align-center justify-center" style={{ backgroundColor: 'var(--primary-subtle)', width: '64px', height: '64px', borderRadius: '50%', marginBottom: '8px' }}>
            <UsersIcon size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="font-primary" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>No Batch Ranking Report Loaded</h3>
          <p className="font-sans text-secondary" style={{ fontSize: '14px', maxWidth: '380px', margin: '0 auto', lineHeight: '1.5' }}>
            To view the batch ranking report, please upload and analyze a batch of resumes on the Batch Analysis screen, or select a past batch scan from the History page.
          </p>
          <button 
            onClick={() => setActiveSection('input')} 
            className="button-primary flex align-center gap-2"
            style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', marginTop: '12px', cursor: 'pointer', backgroundColor: 'var(--primary)', border: 'none', color: '#FFFFFF' }}
          >
            <ConfigureIcon size={14} /> Go to Batch Analysis
          </button>
        </div>
      )}

      {activeSection === 'analysis' && (results.length > 0 || processing) && (
        <div className="flex-col gap-6 fade-in">
          {isQuotaExceeded && (
            <div className="card flex align-center gap-3 w-full" style={{ borderColor: '#EAB308', backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#CA8A04', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <span className="error-icon flex align-center" style={{ display: 'flex', alignItems: 'center' }}><AlertIcon size={18} style={{ color: '#CA8A04' }} /></span>
              <span className="error-message font-sans" style={{ fontSize: '13.5px', fontWeight: '600' }}>
                Your Gemini API Key has exceeded its daily limit (20 requests/day). Bluntly has temporarily fallen back to simulated results so you can see a preview of the report features without blocking you.
              </span>
            </div>
          )}

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
            <div className="flex-col gap-6 w-full">
              <div className="grid grid-cols-4 gap-8">
                {/* Total Resumes */}
                <div className="kpi-card">
                  <div className="flex align-center justify-between">
                    <span className="kpi-title">Total Resumes</span>
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

              {/* Talent Score Distribution Chart */}
              <div className="card text-left">
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Batch Score Distribution</h4>
                <p className="text-secondary" style={{ fontSize: '12.5px', marginTop: '4px', marginBottom: '16px' }}>
                  Distribution of ATS match scores across all candidates in this batch.
                </p>
                
                {/* Visual Bar chart using CSS Grid */}
                <div className="flex align-end gap-1" style={{ height: '120px', borderBottom: '2px solid var(--border)', paddingBottom: '4px', position: 'relative', marginTop: '16px' }}>
                  {(() => {
                    const buckets = Array(10).fill(0);
                    results.forEach(item => {
                      const score = item.analysis?.atsScore || item.analysis?.qualityScore || 0;
                      const idx = Math.min(9, Math.floor(score / 10));
                      buckets[idx]++;
                    });
                    
                    const maxCount = Math.max(1, ...buckets);
                    
                    return buckets.map((count, idx) => {
                      const percentHeight = Math.round((count / maxCount) * 100);
                      return (
                        <div 
                          key={idx} 
                          style={{
                            flex: 1,
                            height: `${Math.max(10, percentHeight)}%`,
                            backgroundColor: count > 0 ? 'var(--primary)' : 'var(--border)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'all 0.3s',
                            position: 'relative',
                            display: 'flex',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title={`Range: ${idx * 10}-${(idx + 1) * 10}% | Candidates: ${count}`}
                        >
                          {count > 0 && (
                            <span style={{
                              position: 'absolute',
                              top: '-20px',
                              color: 'var(--text-primary)',
                              fontSize: '10px',
                              fontWeight: '700'
                            }}>
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex justify-between text-secondary font-mono" style={{ fontSize: '11px', padding: '0 4px', marginTop: '6px' }}>
                  <span>0-10%</span>
                  <span>10-20%</span>
                  <span>20-30%</span>
                  <span>30-40%</span>
                  <span>40-50%</span>
                  <span>50-60%</span>
                  <span>60-70%</span>
                  <span>70-80%</span>
                  <span>80-90%</span>
                  <span>90-100%</span>
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
                
                {/* Export & Compare Buttons */}
                <div className="flex gap-2 align-center">
                  <button 
                    disabled={selectedCompareIds.length < 2}
                    onClick={() => setShowCompareDrawer(true)} 
                    className="button-primary flex align-center gap-2" 
                    style={{ 
                      padding: '8px 14px', 
                      fontSize: '13px', 
                      borderRadius: '8px', 
                      fontWeight: '600', 
                      backgroundColor: selectedCompareIds.length < 2 ? 'var(--border)' : 'var(--primary)',
                      color: selectedCompareIds.length < 2 ? 'var(--text-secondary)' : '#FFFFFF',
                      opacity: selectedCompareIds.length < 2 ? 0.6 : 1, 
                      cursor: selectedCompareIds.length < 2 ? 'not-allowed' : 'pointer',
                      border: 'none'
                    }}
                  >
                    <span>Compare ({selectedCompareIds.length})</span>
                  </button>
                  <button onClick={exportCSV} className="button-secondary flex align-center gap-2" style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '8px', fontWeight: '600' }}>
                    <DownloadIcon size={12} />
                    <span>CSV</span>
                  </button>
                  <button onClick={exportJSON} className="button-secondary flex align-center gap-2" style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '8px', fontWeight: '600' }}>
                    <DownloadIcon size={12} />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              {/* Candidates Table */}
              <div className="table-container">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>Compare</th>
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
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAndSortedResults().map((res, index) => {
                      const rank = index + 1;
                      const extension = res.filename.split('.').pop().toUpperCase();
                      const isExpanded = expandedIndex === index;
                      const score = res.analysis?.atsScore ?? res.analysis?.qualityScore ?? 0;
                      const isSelected = selectedCompareIds.includes(res.id);

                      return (
                        <tr key={res.id} style={{ backgroundColor: isExpanded ? 'var(--bg)' : 'transparent' }}>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => handleSelectCompare(res.id)}
                              style={{ 
                                cursor: 'pointer',
                                width: '16px',
                                height: '16px',
                                accentColor: 'var(--primary)'
                              }}
                            />
                          </td>
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
                              {((res.analysis?.skills?.matched && res.analysis.skills.matched.length > 0)
                                ? res.analysis.skills.matched
                                : (res.analysis?.skills?.detected || [])
                              ).slice(0, 3).map((s, i) => {
                                const isMatched = res.analysis?.skills?.matched && res.analysis.skills.matched.length > 0;
                                return (
                                  <span key={i} className={`tag ${isMatched ? 'tag-matched' : ''}`} style={{
                                    backgroundColor: isMatched ? 'var(--success-subtle)' : 'rgba(148, 163, 184, 0.12)',
                                    color: isMatched ? 'var(--success)' : 'var(--text-secondary)',
                                    fontWeight: '600',
                                    padding: '2px 8px',
                                    fontSize: '11px'
                                  }}>{s}</span>
                                );
                              })}
                              {(!res.analysis?.skills?.matched || res.analysis.skills.matched.length === 0) && (!res.analysis?.skills?.detected || res.analysis.skills.detected.length === 0) && (
                                <span className="text-secondary font-sans" style={{ fontSize: '12px' }}>None</span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
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
                            <li key={i} className="flex align-start gap-2" style={{ marginBottom: '4px' }}>
                              <span style={{ color: 'var(--success)', marginTop: '2px', flexShrink: 0 }} className="flex align-center"><CheckIcon size={12} /></span>
                              <span>{s}</span>
                            </li>
                          )) || <li>None</li>}
                        </ul>
                      </div>
                      <div className="flex-col gap-1" style={{ marginTop: '8px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Areas to Improve</span>
                        <ul style={{ listStyle: 'none', paddingLeft: '0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          {getFilteredAndSortedResults()[expandedIndex].analysis?.feedback?.improvements?.slice(0, 3).map((s, i) => (
                            <li key={i} className="flex align-start gap-2" style={{ marginBottom: '4px' }}>
                              <span style={{ color: 'var(--warning)', marginTop: '2px', flexShrink: 0 }} className="flex align-center"><AlertIcon size={12} /></span>
                              <span>{s}</span>
                            </li>
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

      {showCompareDrawer && (
        <div className="compare-overlay fade-in" style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'stretch'
        }}>
          <div className="compare-drawer slide-left" style={{
            width: '85vw',
            maxWidth: '1000px',
            backgroundColor: 'var(--surface)',
            borderLeft: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto'
          }}>
            <div className="flex justify-between align-center">
              <div className="flex align-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--primary)' }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3 className="font-primary" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Candidate Comparison Matrix
                </h3>
              </div>
              <button 
                onClick={() => setShowCompareDrawer(false)} 
                className="button-secondary flex align-center justify-center" 
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', border: '1px solid var(--border)', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>
            
            <div className="card-divider" style={{ margin: 0 }}></div>
            
            <div className="grid gap-6" style={{
              gridTemplateColumns: `repeat(${selectedCompareIds.length}, minmax(0, 1fr))`,
              alignItems: 'start'
            }}>
              {selectedCompareIds.map(id => {
                const cand = results.find(r => r.id === id);
                if (!cand) return null;
                const score = cand.analysis?.atsScore ?? cand.analysis?.qualityScore ?? 0;
                return (
                  <div key={id} className="card text-left" style={{
                    borderColor: 'var(--border)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    padding: '16px'
                  }}>
                    {/* Header */}
                    <div className="flex align-center gap-3">
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-subtle)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700'
                      }}>
                        {cand.analysis?.candidateName?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-col" style={{ overflow: 'hidden' }}>
                        <strong className="truncate" style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>
                          {cand.analysis?.candidateName || 'N/A'}
                        </strong>
                        <span className="truncate" style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                          {cand.filename}
                        </span>
                      </div>
                    </div>
                    
                    <div className="card-divider" style={{ margin: 0 }}></div>
                    
                    {/* Scores KPI */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', padding: '8px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>ATS Match</span>
                        <strong style={{ fontSize: '18px', color: 'var(--primary)', display: 'block', marginTop: '4px' }}>
                          {score}%
                        </strong>
                      </div>
                      <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', padding: '8px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Quality</span>
                        <strong style={{ fontSize: '18px', color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>
                          {cand.analysis?.qualityScore || 0}%
                        </strong>
                      </div>
                    </div>

                    {/* Section breakdown */}
                    <div className="flex-col gap-2" style={{ fontSize: '12px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Section Breakdown</strong>
                      <div className="flex-col gap-1.5">
                        {['experience', 'education', 'skills', 'formatting', 'impact'].map(key => {
                          const val = cand.analysis?.sections?.[key] || 0;
                          return (
                            <div key={key} className="flex-col gap-0.5">
                              <div className="flex justify-between" style={{ fontSize: '10px', fontWeight: '500' }}>
                                <span style={{ textTransform: 'capitalize' }}>{key}</span>
                                <span>{val}/100</span>
                              </div>
                              <div className="progress-bar-track" style={{ height: '4px' }}>
                                <div className="progress-bar-fill primary" style={{ width: `${val}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '2px' }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Exp */}
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Experience: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{cand.analysis?.structuredResume?.experienceYears || 0} Years</strong>
                    </div>

                    {/* Matched Skills */}
                    <div className="flex-col gap-1 text-left" style={{ fontSize: '12px' }}>
                      <strong style={{ color: 'var(--success)' }}>Matched Skills ({cand.analysis?.skills?.matched?.length || 0})</strong>
                      <div className="flex flex-wrap gap-1" style={{ maxHeight: '72px', overflowY: 'auto' }}>
                        {cand.analysis?.skills?.matched?.map((skill, idx) => (
                          <span key={idx} className="tag tag-matched" style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--success-subtle)', color: 'var(--success)', borderRadius: '4px' }}>{skill}</span>
                        )) || <span style={{ color: 'var(--text-secondary)' }}>None</span>}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div className="flex-col gap-1 text-left" style={{ fontSize: '12px' }}>
                      <strong style={{ color: 'var(--danger)' }}>Missing Skills ({cand.analysis?.skills?.missing?.length || 0})</strong>
                      <div className="flex flex-wrap gap-1" style={{ maxHeight: '72px', overflowY: 'auto' }}>
                        {cand.analysis?.skills?.missing?.map((skill, idx) => (
                          <span key={idx} className="tag" style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)', borderRadius: '4px' }}>{skill}</span>
                        )) || <span style={{ color: 'var(--text-secondary)' }}>None</span>}
                      </div>
                    </div>

                    {/* Strengths */}
                    <div className="flex-col gap-1 text-left" style={{ fontSize: '12px', flexGrow: 1 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Strengths</strong>
                      <ul style={{ paddingLeft: '12px', margin: 0, color: 'var(--text-secondary)', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {cand.analysis?.feedback?.strengths?.slice(0, 2).map((s, i) => (
                          <li key={i}>{s}</li>
                        )) || <li>None</li>}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="flex-col gap-1 text-left" style={{ fontSize: '12px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Improvements</strong>
                      <ul style={{ paddingLeft: '12px', margin: 0, color: 'var(--text-secondary)', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {cand.analysis?.feedback?.improvements?.slice(0, 2).map((s, i) => (
                          <li key={i}>{s}</li>
                        )) || <li>None</li>}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
        
        .compare-overlay {
          transition: opacity 0.2s ease-in-out;
        }
        
        .compare-drawer {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .tag-matched {
          background-color: var(--success-subtle);
          color: var(--success);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
