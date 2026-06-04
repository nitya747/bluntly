import { useState, useRef } from 'react';
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
  ChevronDownIcon 
} from './Icons';

export default function BatchView({ onAddHistory }) {
  const [files, setFiles] = useState([]);
  const [jobDescription, setJobDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progressLog, setProgressLog] = useState([]);
  const [results, setResults] = useState([]);
  const [sortField, setSortField] = useState('atsScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeSection, setActiveSection] = useState('input'); // 'input' or 'analysis'

  const loadSampleJD = () => {
    setJobDescription(
      "Looking for a Senior React Developer with experience in React, Next.js, and TypeScript. Skills in Custom CSS, Tailwind, and Kubernetes are a plus."
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

    // Limit to 20 files
    const updatedFiles = [...files, ...validFiles].slice(0, 20);
    setFiles(updatedFiles);
  };

  const removeFile = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setError(null);
    setResults([]);
    setProgressLog([]);
    setExpandedIndex(null);
    setActiveSection('input');
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

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Save the last incomplete line back to buffer
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
    const { event, index, name, status, result, error, results: finalResults } = eventData;

    if (event === 'init') {
      // Stream initialized
    } else if (event === 'progress') {
      setProgressLog(prev => 
        prev.map(log => 
          log.index === index 
            ? { ...log, status, error: error || null, result: result || null }
            : log
        )
      );
    } else if (event === 'complete') {
      setProcessing(false);
      
      // Parse results list
      const formattedResults = finalResults.map((res, rankIdx) => ({
        id: res.id || Math.random().toString(36).substr(2, 9),
        filename: res.filename,
        success: res.success,
        error: res.error || null,
        analysis: res.analysis || null,
      })).filter(res => res.success);

      setResults(formattedResults);

      // Add each successfully parsed result to global scan history
      formattedResults.forEach(res => {
        onAddHistory({
          id: res.id,
          filename: res.filename,
          analysis: res.analysis,
          timestamp: res.analysis.timestamp || new Date().toLocaleTimeString(),
        });
      });
    }
  };

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortedResults = () => {
    return [...results].sort((a, b) => {
      let valA, valB;

      if (sortField === 'name') {
        valA = a.analysis.candidateName.toLowerCase();
        valB = b.analysis.candidateName.toLowerCase();
      } else if (sortField === 'format') {
        valA = a.filename.split('.').pop().toLowerCase();
        valB = b.filename.split('.').pop().toLowerCase();
      } else if (sortField === 'atsScore') {
        valA = a.analysis.atsScore || 0;
        valB = b.analysis.atsScore || 0;
      } else if (sortField === 'qualityScore') {
        valA = a.analysis.qualityScore || 0;
        valB = b.analysis.qualityScore || 0;
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

  // CSV Exporter
  const exportCSV = () => {
    if (results.length === 0) return;
    
    const headers = ['Rank', 'Candidate Name', 'File Name', 'Format', 'ATS Score (%)', 'Quality Score (%)', 'Top Skills'];
    const sorted = getSortedResults();
    
    const rows = sorted.map((res, idx) => {
      const extension = res.filename.split('.').pop().toUpperCase();
      const topSkills = res.analysis.skills.matched.slice(0, 3).join(', ') || 'None';
      
      return [
        idx + 1,
        `"${res.analysis.candidateName}"`,
        `"${res.filename}"`,
        extension,
        res.analysis.atsScore !== null ? res.analysis.atsScore : 'N/A',
        res.analysis.qualityScore,
        `"${topSkills}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    downloadFile(csvContent, 'resume_ranking_report.csv', 'text/csv;charset=utf-8;');
  };

  // JSON Exporter
  const exportJSON = () => {
    if (results.length === 0) return;
    const sorted = getSortedResults();
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

  return (
    <div className="workspace flex-col gap-6">
      {/* Sub-navigation tabs for Setup vs Analysis */}
      {results.length > 0 && (
        <div className="section-tabs">
          <button
            onClick={() => setActiveSection('input')}
            className={`section-tab-btn font-sans ${activeSection === 'input' ? 'active' : ''}`}
          >
            Configure Matcher
          </button>
          <button
            onClick={() => setActiveSection('analysis')}
            className={`section-tab-btn font-sans ${activeSection === 'analysis' ? 'active' : ''}`}
          >
            Analysis Report
          </button>
        </div>
      )}

      {/* Configure Matcher Section */}
      {activeSection === 'input' && (
        <div className="flex-col gap-6">
          {/* Upload Zone & JD inputs */}
          <div className="input-section grid grid-cols-2 gap-8">
            {/* Batch File Zone */}
            <div 
              className={`dropzone card flex-col align-center justify-center gap-3 ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                onChange={handleFileChange} 
                accept=".pdf,.tex,.txt" 
                multiple 
                className="hidden-input" 
                id="batch-file-input"
              />
              
              {files.length === 0 ? (
                <label htmlFor="batch-file-input" className="upload-label flex-col align-center justify-center gap-3 cursor-pointer">
                  <div className="upload-icon-circle flex align-center justify-center">
                    <UploadIcon size={24} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="upload-text flex-col align-center text-center">
                    <span className="upload-title font-sans">Upload Resumes in Batch</span>
                    <span className="upload-subtitle font-sans">Select up to 20 PDF/LaTeX files</span>
                    <span className="upload-formats font-mono">Drag multiple files here</span>
                  </div>
                </label>
              ) : (
                <div className="batch-files-view flex-col w-full h-full p-2">
                  <div className="flex justify-between align-center border-b pb-2 mb-2">
                    <span className="files-count font-sans">{files.length} files selected</span>
                    <button onClick={clearAllFiles} className="button-secondary btn-xs flex align-center gap-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <TrashIcon size={12} /> Reset
                    </button>
                  </div>
                  <div className="files-list flex-col gap-1 overflow-y-auto flex-1">
                    {files.map((f, i) => (
                      <div key={i} className="file-row flex align-center justify-between font-sans">
                        <span className="file-row-name truncate">{f.name}</span>
                        <button onClick={() => removeFile(i)} className="remove-row-btn">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Job Description Card */}
            <div className="jd-box card flex-col gap-3">
              <div className="flex justify-between align-center">
                <label className="label-title font-sans">Compare Against JD Requirements</label>
                <button onClick={loadSampleJD} className="button-secondary btn-xs flex align-center gap-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <SparklesIcon size={12} /> Load Sample JD
                </button>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description here to rank candidate resumes by ATS match score..."
                className="jd-textarea font-sans"
              />
              <div className="jd-footer flex justify-between font-mono">
                <span>{jobDescription.split(/\s+/).filter(Boolean).length} words</span>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="action-row flex justify-center">
            <button
              onClick={runBatchAnalysis}
              disabled={files.length === 0 || processing}
              className="button-primary run-btn font-sans"
            >
              {processing ? (
                <span className="flex align-center justify-center gap-2" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <SettingsIcon size={18} className="spin-animation" /> Processing Batch Live...
                </span>
              ) : (
                <span className="flex align-center justify-center gap-2" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <ChartIcon size={18} /> Parse & Rank Candidate Batch
                </span>
              )}
            </button>
          </div>

          {/* Error Card */}
          {error && (
            <div className="error-card card flex align-center gap-3">
              <span className="error-icon flex align-center"><AlertIcon size={20} /></span>
              <span className="error-message font-sans">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Analysis Section */}
      {activeSection === 'analysis' && (
        <div className="flex-col gap-6">
          {/* Error Card */}
          {error && !processing && (
            <div className="error-card card flex align-center gap-3">
              <span className="error-icon flex align-center"><AlertIcon size={20} /></span>
              <span className="error-message font-sans">{error}</span>
            </div>
          )}

          {/* SSE Progress Feed List */}
          {progressLog.length > 0 && (
            <div className="progress-section card flex-col gap-3">
              <div className="flex justify-between align-center">
                <h3 className="card-title font-sans">Batch Progress Indicator</h3>
                <span className="percent-indicator font-mono">{percentComplete}% ({completedCount}/{totalCount})</span>
              </div>
              
              {/* Progress Bar Track */}
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${percentComplete}%` }}></div>
              </div>

              {/* Individual Status Log Items */}
              <div className="progress-log-list grid grid-cols-2 gap-3 mt-2">
                {progressLog.map((log) => (
                  <div key={log.index} className="log-row card flex align-center justify-between py-2 px-3">
                    <span className="log-name truncate font-sans">{log.name}</span>
                    <span className={`log-status font-mono ${log.status} flex align-center gap-1.5`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {log.status === 'queued' && <><ClockIcon size={14} /> Queued</>}
                      {log.status === 'parsing' && <><SettingsIcon size={14} className="spin-animation" /> Parsing</>}
                      {log.status === 'analysing' && <><BotIcon size={14} /> Analysing</>}
                      {log.status === 'completed' && <><CheckIcon size={14} /> Done</>}
                      {log.status === 'error' && <><XIcon size={14} /> Error</>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ranked Candidates Table */}
          {results.length > 0 && (
            <div className="results-section flex-col gap-4">
              <div className="flex justify-between align-center">
                <h2 className="section-title font-sans">Ranked Candidates List</h2>
                
                {/* Export Buttons */}
                <div className="export-bar flex gap-2">
                  <button onClick={exportCSV} className="button-secondary btn-sm font-sans flex align-center gap-1.5" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <DownloadIcon size={14} /> Export CSV
                  </button>
                  <button onClick={exportJSON} className="button-secondary btn-sm font-sans flex align-center gap-1.5" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <DownloadIcon size={14} /> Export JSON
                  </button>
                </div>
              </div>

              {/* Ranking Table */}
              <div className="table-container card p-0">
                <table className="ranking-table font-sans">
                  <thead>
                    <tr>
                      <th className="font-sans">Rank</th>
                      <th onClick={() => handleSort('name')} className="sortable font-sans">
                        <span className="flex align-center gap-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Name {sortField === 'name' ? (sortOrder === 'asc' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />) : ''}
                        </span>
                      </th>
                      <th onClick={() => handleSort('format')} className="sortable font-sans">
                        <span className="flex align-center gap-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Format {sortField === 'format' ? (sortOrder === 'asc' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />) : ''}
                        </span>
                      </th>
                      <th onClick={() => handleSort('atsScore')} className="sortable font-sans">
                        <span className="flex align-center gap-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          ATS Score {sortField === 'atsScore' ? (sortOrder === 'asc' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />) : ''}
                        </span>
                      </th>
                      <th onClick={() => handleSort('qualityScore')} className="sortable font-sans">
                        <span className="flex align-center gap-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Quality {sortField === 'qualityScore' ? (sortOrder === 'asc' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />) : ''}
                        </span>
                      </th>
                      <th className="font-sans">Top Core Skills</th>
                      <th className="font-sans">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedResults().map((res, index) => {
                      const sortedIdx = index + 1;
                      const format = res.filename.split('.').pop().toUpperCase();
                      const isExpanded = expandedIndex === index;
                      const score = res.analysis.atsScore !== null ? res.analysis.atsScore : res.analysis.qualityScore;

                      return (
                        <tr key={res.id} className={isExpanded ? 'row-expanded' : ''}>
                          <td>
                            <span className={`rank-badge font-mono ${sortedIdx <= 3 ? 'top-rank' : ''}`}>
                              #{sortedIdx}
                            </span>
                          </td>
                          <td className="font-bold">{res.analysis.candidateName}</td>
                          <td className="font-mono text-sm">{format}</td>
                          <td>
                            <span className={`score-badge font-mono ${score >= 80 ? 'good' : score >= 65 ? 'avg' : 'low'}`}>
                              {res.analysis.atsScore !== null ? `${res.analysis.atsScore}%` : 'N/A'}
                            </span>
                          </td>
                          <td>
                            <span className="font-mono">{res.analysis.qualityScore}%</span>
                          </td>
                          <td>
                            <div className="flex gap-1 flex-wrap">
                              {res.analysis.skills.matched.slice(0, 3).map((s, i) => (
                                <span key={i} className="chip chip-success font-mono text-xs">{s}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <button onClick={() => toggleRowExpand(index)} className="button-secondary btn-xs">
                              {isExpanded ? 'Collapse' : 'Report'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Accordion Detail Card Expansion */}
              {expandedIndex !== null && (
                <div className="expanded-detail-card card flex-col gap-4 mt-2">
                  <div className="flex justify-between align-center border-b pb-2">
                    <h3 className="candidate-detail-title font-sans">
                      Resume Report for **{getSortedResults()[expandedIndex].analysis.candidateName}**
                    </h3>
                    <button onClick={() => setExpandedIndex(null)} className="close-expanded-btn">✕</button>
                  </div>

                  <div className="grid grid-cols-2 gap-8 py-2">
                    {/* Score breakdown and summary */}
                    <div className="flex-col gap-3">
                      <div className="flex justify-around bg-primary-light p-3 rounded-12">
                        <div className="flex-col align-center">
                          <span className="score-val font-mono">{getSortedResults()[expandedIndex].analysis.atsScore}%</span>
                          <span className="score-lbl">ATS Score</span>
                        </div>
                        <div className="flex-col align-center">
                          <span className="score-val font-mono">{getSortedResults()[expandedIndex].analysis.qualityScore}%</span>
                          <span className="score-lbl">Quality Score</span>
                        </div>
                      </div>
                      <p className="detail-summary font-sans">
                        {getSortedResults()[expandedIndex].analysis.feedback.summary}
                      </p>
                    </div>

                    {/* Checklist Strengths & Improvements */}
                    <div className="flex-col gap-3">
                      <div className="flex-col gap-1">
                        <span className="detail-lbl font-sans">Strengths</span>
                        <ul className="detail-list">
                          {getSortedResults()[expandedIndex].analysis.feedback.strengths.slice(0, 2).map((s, i) => (
                            <li key={i} className="font-sans">• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex-col gap-1 mt-2">
                        <span className="detail-lbl font-sans">Key Areas to Improve</span>
                        <ul className="detail-list">
                          {getSortedResults()[expandedIndex].analysis.feedback.improvements.slice(0, 2).map((s, i) => (
                            <li key={i} className="font-sans">• {s}</li>
                          ))}
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
        .section-tabs {
          display: flex;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          padding: 0.3rem;
          border-radius: 9999px;
          align-self: center;
          margin-bottom: 0.5rem;
          box-shadow: var(--shadow-sm);
          width: fit-content;
        }

        .section-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0.5rem 1.75rem;
          border-radius: 9999px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .section-tab-btn:hover {
          color: var(--text-primary);
        }

        .section-tab-btn.active {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: #FFFFFF;
          box-shadow: var(--btn-shadow);
        }

        .workspace {
          padding: 2rem;
          overflow-y: auto;
          flex: 1;
        }

        .dropzone {
          border: 2.5px dashed var(--border-color);
          height: 240px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dropzone:hover, .dropzone.drag-over {
          border-color: var(--primary);
          background-color: var(--primary-light);
        }

        .hidden-input {
          display: none;
        }

        .upload-icon-circle {
          background-color: var(--primary-light);
          width: 54px;
          height: 54px;
          border-radius: 50%;
          font-size: 1.5rem;
        }

        .upload-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .upload-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        .upload-formats {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.4rem;
        }

        .batch-files-view {
          align-self: flex-start;
          width: 100%;
          height: 100%;
        }

        .files-count {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .files-list {
          padding-right: 0.25rem;
        }

        .file-row {
          background-color: var(--bg-primary);
          padding: 0.4rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          margin-bottom: 0.25rem;
        }

        .file-row-name {
          max-width: 85%;
        }

        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .remove-row-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-weight: bold;
          font-size: 0.85rem;
        }

        .remove-row-btn:hover {
          color: var(--danger);
        }

        .jd-box {
          height: 240px;
        }

        .label-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .jd-textarea {
          width: 100%;
          flex: 1;
          resize: none;
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .jd-textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--border-glow);
        }

        .jd-footer {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .run-btn {
          width: 320px;
          padding: 0.85rem;
          font-size: 1rem;
        }

        .error-card {
          border-color: var(--danger);
          background-color: var(--danger-bg);
          color: var(--danger);
          padding: 1rem;
        }

        .error-icon {
          font-size: 1.3rem;
        }

        .error-message {
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* Progress Feed */
        .percent-indicator {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--primary);
        }

        .progress-bar-track {
          background-color: var(--bg-primary);
          height: 10px;
          border-radius: 999px;
          overflow: hidden;
          width: 100%;
        }

        .progress-bar-fill {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          height: 100%;
          border-radius: 999px;
          transition: width 0.4s ease-out;
        }

        .progress-log-list {
          max-height: 150px;
          overflow-y: auto;
        }

        .log-row {
          border: 1px solid var(--border-color);
          box-shadow: none;
          background-color: var(--bg-primary);
        }

        .log-name {
          max-width: 60%;
          font-size: 0.8rem;
          color: var(--text-primary);
        }

        .log-status {
          font-size: 0.75rem;
          font-weight: 700;
        }

        .log-status.queued { color: var(--text-muted); }
        .log-status.parsing { color: var(--primary); }
        .log-status.analysing { color: var(--secondary); }
        .log-status.completed { color: var(--success); }
        .log-status.error { color: var(--danger); }

        /* Ranking Table */
        .section-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .table-container {
          overflow-x: auto;
          border: 1px solid var(--border-color);
          border-radius: 16px;
        }

        .ranking-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .ranking-table th {
          background-color: var(--bg-primary);
          color: var(--text-secondary);
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid var(--border-color);
        }

        .ranking-table th.sortable {
          cursor: pointer;
        }

        .ranking-table th.sortable:hover {
          color: var(--primary);
        }

        .ranking-table td {
          padding: 0.9rem 1.25rem;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .ranking-table tbody tr {
          transition: background-color 0.2s;
        }

        .ranking-table tbody tr:hover {
          background-color: var(--primary-light);
        }

        .ranking-table tbody tr.row-expanded {
          background-color: var(--primary-light);
          border-left: 3px solid var(--primary);
        }

        .rank-badge {
          background-color: var(--bg-primary);
          font-size: 0.8rem;
          font-weight: bold;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          color: var(--text-muted);
        }

        .rank-badge.top-rank {
          background-color: var(--primary-light);
          color: var(--primary);
          border: 1px solid var(--border-glow);
        }

        .font-bold {
          font-weight: 700;
          color: var(--text-primary);
        }

        .score-badge {
          font-weight: 800;
          font-size: 0.9rem;
        }

        .score-badge.good { color: var(--success); }
        .score-badge.avg { color: var(--warning); }
        .score-badge.low { color: var(--danger); }

        .btn-sm {
          padding: 0.4rem 1rem;
          font-size: 0.8rem;
          border-radius: 8px;
        }

        .btn-xs {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          border-radius: 6px;
        }

        /* Expanded Details Accordion */
        .expanded-detail-card {
          border-color: var(--primary);
          animation: slide-down 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .candidate-detail-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .close-expanded-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 1rem;
          cursor: pointer;
        }

        .close-expanded-btn:hover {
          color: var(--text-primary);
        }

        .rounded-12 {
          border-radius: 12px;
        }

        .score-val {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--primary);
        }

        .score-lbl {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .detail-summary {
          font-size: 0.8rem;
          line-height: 1.4;
          color: var(--text-secondary);
        }

        .detail-lbl {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .detail-list {
          list-style: none;
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .mt-2 { margin-top: 0.75rem; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        :global(.spin-animation) {
          animation: spin 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
