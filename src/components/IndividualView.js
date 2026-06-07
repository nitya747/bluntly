'use client';

import { useState, useEffect } from 'react';
import { 
  FileTextIcon, 
  FileCodeIcon, 
  XIcon, 
  UploadIcon, 
  SparklesIcon, 
  SearchIcon, 
  AlertIcon, 
  CheckIcon, 
  SettingsIcon,
  BotIcon
} from './Icons';

export default function IndividualView({ 
  onAddHistory, 
  selectedAnalysis, 
  credits, 
  setCredits, 
  history = [] 
}) {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeFeedbackTab, setActiveFeedbackTab] = useState('summary');
  const [dragOver, setDragOver] = useState(false);
  const [activeSection, setActiveSection] = useState('input'); // 'input' (Configure) or 'analysis' (Analysis Report)

  // Load selected analysis if loaded from history
  useEffect(() => {
    if (selectedAnalysis) {
      const timer = setTimeout(() => {
        setResult(selectedAnalysis.analysis);
        setJobDescription(selectedAnalysis.analysis.jobDescription || '');
        setFile({ name: selectedAnalysis.filename, size: 0, isSavedRecord: true });
        setError(null);
        setActiveSection('analysis');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedAnalysis]);

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
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    if (extension !== 'pdf' && extension !== 'tex' && extension !== 'txt') {
      setError('Unsupported file type. Please upload a PDF (.pdf) or LaTeX (.tex) file.');
      setFile(null);
      return;
    }
    setError(null);
    setFile(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  const runAnalysis = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze resume.');
      }

      setResult(data.analysis);
      if (data.credits !== undefined) {
        setCredits(data.credits);
      }
      
      // Save to global history
      onAddHistory({
        id: data.analysis.id,
        filename: file.name,
        analysis: data.analysis,
        timestamp: data.analysis.timestamp || new Date().toLocaleTimeString(),
      });

      // Automatically switch to the Analysis Report screen
      setActiveSection('analysis');
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper to load a scan directly from the recent scans list
  const loadRecentScan = (record) => {
    setResult(record.analysis);
    setJobDescription(record.analysis.jobDescription || '');
    setFile({ name: record.filename, size: 0, isSavedRecord: true });
    setError(null);
    setActiveSection('analysis');
  };

  // Helper for progress bar color
  const getProgressColorClass = (score) => {
    if (score >= 80) return 'success';
    if (score >= 65) return 'warning';
    return 'danger';
  };

  const getStatusLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Good Match';
    return 'Needs Improvement';
  };

  // Keyword Match Score: ratio of matched to matched+missing
  const getKeywordMatchScore = () => {
    if (!result) return 0;
    const matched = result.skills?.matched?.length || 0;
    const missing = result.skills?.missing?.length || 0;
    const total = matched + missing;
    return total > 0 ? Math.round((matched / total) * 100) : 0;
  };

  // Dynamic Overall Ranking calculated from session history
  const getOverallRanking = () => {
    if (!result || history.length === 0) return { rank: 1, total: 1 };
    
    // Sort history by score descending
    const sorted = [...history].sort((a, b) => {
      const scoreA = a.analysis?.atsScore ?? a.analysis?.qualityScore ?? 0;
      const scoreB = b.analysis?.atsScore ?? b.analysis?.qualityScore ?? 0;
      return scoreB - scoreA;
    });

    const index = sorted.findIndex(item => item.id === result.id || item.analysis?.id === result.id);
    const rank = index !== -1 ? index + 1 : 1;
    return { rank, total: history.length };
  };

  const rankingInfo = getOverallRanking();
  const keywordScore = getKeywordMatchScore();
  const individualScans = history.slice(0, 5); // Last 5 scans

  return (
    <div className="workspace flex-col gap-6 fade-in">
      {/* Secondary Navigation (Configure vs Analysis Report) */}
      <div className="tabs-navigation">
        <button
          onClick={() => setActiveSection('input')}
          className={`tab-nav-btn ${activeSection === 'input' ? 'active' : ''}`}
        >
          Configure
        </button>
        <button
          onClick={() => {
            if (result) {
              setActiveSection('analysis');
            }
          }}
          disabled={!result}
          className={`tab-nav-btn ${activeSection === 'analysis' ? 'active' : ''}`}
          style={{ opacity: result ? 1 : 0.5, cursor: result ? 'pointer' : 'not-allowed' }}
        >
          Analysis Report
        </button>
      </div>

      {/* 1. Configure Screen Pattern (Input Only) */}
      {activeSection === 'input' && (
        <div className="flex-col gap-8 fade-in">
          <div className="grid grid-cols-2 gap-8">
            {/* Resume Upload Card */}
            <div className="card">
              <h3 className="card-title">Resume File</h3>
              <div className="card-divider"></div>
              
              <div 
                className={`dropzone-area flex-col align-center justify-center gap-3 ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="file-details flex-col align-center gap-3 w-full">
                    <div className="file-icon-wrapper flex align-center justify-center">
                      {file.name.endsWith('.tex') ? <FileCodeIcon size={24} style={{ color: 'var(--primary)' }} /> : <FileTextIcon size={24} style={{ color: 'var(--primary)' }} />}
                    </div>
                    <div className="file-info flex-col align-center text-center">
                      <span className="file-name truncate">{file.name}</span>
                      {file.isSavedRecord ? (
                        <span className="file-size text-secondary">Saved Session Scan</span>
                      ) : (
                        <span className="file-size font-mono">{Math.round(file.size / 1024)} KB</span>
                      )}
                    </div>
                    <button onClick={clearFile} className="button-secondary flex align-center gap-2" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}>
                      <XIcon size={14} /> Clear File
                    </button>
                  </div>
                ) : (
                  <label className="upload-box flex-col align-center justify-center gap-3 cursor-pointer">
                    <input type="file" onChange={handleFileChange} accept=".pdf,.tex,.txt" style={{ display: 'none' }} />
                    <div className="upload-icon-wrapper flex align-center justify-center">
                      <UploadIcon size={24} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div className="flex-col align-center text-center">
                      <span className="upload-title">Upload Resume</span>
                      <span className="upload-desc">Drag & drop or click to browse</span>
                      <span className="upload-note font-mono">PDF, LaTeX (.tex) or Text (.txt)</span>
                    </div>
                  </label>
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

          {/* Error display */}
          {error && (
            <div className="error-banner flex align-center gap-3">
              <AlertIcon size={16} />
              <span className="error-text">{error}</span>
            </div>
          )}

          {/* Analyze Button & Cost */}
          <div className="flex-col align-center gap-2" style={{ marginTop: '8px' }}>
            <button
              onClick={runAnalysis}
              disabled={!file || analyzing || credits === 0}
              className="button-primary run-analysis-btn"
            >
              {analyzing ? (
                <>
                  <SettingsIcon size={16} className="spin-animation" style={{ marginRight: '8px' }} />
                  Analyzing Resume...
                </>
              ) : (
                'Analyze Resume'
              )}
            </button>
            <span className="cost-subtext">
              {file?.isSavedRecord 
                ? 'Viewing saved scan' 
                : `Costs 1 credit — You have ${credits} credits remaining`}
            </span>
          </div>

          {/* Recent Analyses Table */}
          <div className="card">
            <h3 className="card-title">Recent Single Analyses</h3>
            <div className="card-divider"></div>
            {individualScans.length === 0 ? (
              <p className="font-sans text-secondary text-center py-4" style={{ fontSize: '14px' }}>
                No recent scans in this session.
              </p>
            ) : (
              <div className="table-container">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Candidate Name</th>
                      <th>Filename</th>
                      <th>ATS Match Score</th>
                      <th>Quality Score</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {individualScans.map((scan) => {
                      const score = scan.analysis?.atsScore ?? scan.analysis?.qualityScore ?? 0;
                      return (
                        <tr key={scan.id}>
                          <td style={{ fontWeight: '600' }}>{scan.analysis?.candidateName || 'N/A'}</td>
                          <td className="font-mono text-secondary" style={{ fontSize: '13px' }}>{scan.filename}</td>
                          <td>
                            <span 
                              className="tag"
                              style={{ 
                                backgroundColor: score >= 80 ? 'rgba(16, 185, 129, 0.1)' : score >= 65 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: score >= 80 ? 'var(--success)' : score >= 65 ? 'var(--warning)' : 'var(--danger)'
                              }}
                            >
                              {scan.analysis?.atsScore !== null && scan.analysis?.atsScore !== undefined ? `${scan.analysis.atsScore}%` : 'N/A'}
                            </span>
                          </td>
                          <td className="font-mono" style={{ fontWeight: '600' }}>{scan.analysis?.qualityScore}%</td>
                          <td>
                            <button
                              onClick={() => loadRecentScan(scan)}
                              className="button-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
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
          </div>
        </div>
      )}

      {/* 2. Analysis Report Screen Pattern (Results Only, No inputs/uploads) */}
      {activeSection === 'analysis' && result && (
        <div className="flex-col gap-8 fade-in">
          {/* Section 1: KPI Cards */}
          <div className="grid grid-cols-4 gap-6">
            {/* ATS Match Score */}
            <div className="kpi-card">
              <span className="kpi-title">ATS Match Score</span>
              <span className="kpi-score">
                {result.atsScore !== null && result.atsScore !== undefined ? `${result.atsScore} / 100` : 'N/A'}
              </span>
              <span className="kpi-status" style={{ color: `var(--${getProgressColorClass(result.atsScore || 0)})`, fontWeight: '600' }}>
                {result.atsScore !== null && result.atsScore !== undefined ? getStatusLabel(result.atsScore) : 'No JD supplied'}
              </span>
              <div className="progress-bar-track">
                <div 
                  className={`progress-bar-fill ${getProgressColorClass(result.atsScore || 0)}`} 
                  style={{ width: `${result.atsScore || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Resume Quality */}
            <div className="kpi-card">
              <span className="kpi-title">Resume Quality</span>
              <span className="kpi-score">{result.qualityScore} / 100</span>
              <span className="kpi-status" style={{ color: `var(--${getProgressColorClass(result.qualityScore)})`, fontWeight: '600' }}>
                {getStatusLabel(result.qualityScore)}
              </span>
              <div className="progress-bar-track">
                <div 
                  className={`progress-bar-fill ${getProgressColorClass(result.qualityScore)}`} 
                  style={{ width: `${result.qualityScore}%` }}
                ></div>
              </div>
            </div>

            {/* Keyword Match */}
            <div className="kpi-card">
              <span className="kpi-title">Keyword Match</span>
              <span className="kpi-score">{keywordScore} / 100</span>
              <span className="kpi-status" style={{ color: `var(--${getProgressColorClass(keywordScore)})`, fontWeight: '600' }}>
                {getStatusLabel(keywordScore)}
              </span>
              <div className="progress-bar-track">
                <div 
                  className={`progress-bar-fill ${getProgressColorClass(keywordScore)}`} 
                  style={{ width: `${keywordScore}%` }}
                ></div>
              </div>
            </div>

            {/* Overall Ranking */}
            <div className="kpi-card">
              <span className="kpi-title">Overall Ranking</span>
              <span className="kpi-score">#{rankingInfo.rank} <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-secondary)' }}>/ {rankingInfo.total}</span></span>
              <span className="kpi-status" style={{ fontWeight: '600', color: rankingInfo.rank === 1 ? 'var(--success)' : 'var(--text-secondary)' }}>
                {rankingInfo.rank === 1 ? 'Top Candidate' : rankingInfo.rank <= 3 ? 'Strong Match' : 'Screen Candidate'}
              </span>
              <div className="progress-bar-track">
                <div 
                  className="progress-bar-fill primary" 
                  style={{ width: `${((rankingInfo.total - rankingInfo.rank + 1) / rankingInfo.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Grid layout for Breakdown, Skills, Rules, and Feedback */}
          <div className="grid grid-cols-2 gap-8">
            {/* Section 2: Section Breakdown */}
            <div className="card">
              <h3 className="card-title">Section Breakdown</h3>
              <div className="card-divider"></div>
              <div className="flex-col gap-4">
                {Object.entries(result.sections || {}).map(([key, score]) => (
                  <div key={key} className="progress-bar-container">
                    <div className="flex justify-between font-sans" style={{ fontSize: '13px', fontWeight: '500' }}>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{key}</span>
                      <span style={{ fontWeight: '600' }}>{score}%</span>
                    </div>
                    <div className="progress-bar-track">
                      <div 
                        className="progress-bar-fill primary" 
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                
                {/* Experience Match detail line */}
                {result.experienceMatch && result.experienceMatch.required > 0 && (
                  <div className="flex align-center justify-between" style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '13px',
                    marginTop: '8px'
                  }}>
                    <span className="text-secondary">Experience Alignment: Required <strong>{result.experienceMatch.required} yrs</strong> | Detected <strong>{result.experienceMatch.detected} yrs</strong></span>
                    <span className={`tag ${result.experienceMatch.matched ? 'tag-matched' : 'tag-missing'}`}>
                      {result.experienceMatch.matched ? 'MATCH' : 'GAP'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Skills Analysis */}
            <div className="card">
              <h3 className="card-title">Skills Analysis</h3>
              <div className="card-divider"></div>
              <div className="flex-col gap-4">
                {/* Matched Skills */}
                <div className="flex-col gap-2">
                  <span className="font-sans" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Matched Skills ({result.skills?.matched?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.skills?.matched?.length === 0 ? (
                      <span className="no-skills font-sans" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>None matched</span>
                    ) : (
                      result.skills.matched.map((s, idx) => (
                        <span key={idx} className="tag tag-matched">{s}</span>
                      ))
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                {result.skills?.missing && result.skills.missing.length > 0 && (
                  <div className="flex-col gap-2" style={{ marginTop: '8px' }}>
                    <span className="font-sans" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Missing Keywords ({result.skills.missing.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {result.skills.missing.map((s, idx) => (
                        <span key={idx} className="tag tag-missing">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Detected Skills */}
                <div className="flex-col gap-2" style={{ marginTop: '8px' }}>
                  <span className="font-sans" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Other Detected Skills ({result.skills?.detected?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.skills?.detected?.length === 0 ? (
                      <span className="no-skills font-sans" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>None detected</span>
                    ) : (
                      result.skills.detected.map((s, idx) => (
                        <span key={idx} className="tag tag-neutral">{s}</span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Rule Checks */}
            <div className="card">
              <h3 className="card-title">Rule Checks</h3>
              <div className="card-divider"></div>
              <div className="flex-col gap-3">
                {[
                  { key: 'email', label: 'Email Contact Information', check: !result.ruleViolations?.includes('Missing email') },
                  { key: 'phone', label: 'Phone Contact Information', check: !result.ruleViolations?.includes('Missing phone') },
                  { key: 'length', label: 'Resume Content Length', check: !result.ruleViolations?.includes('Resume too short') },
                  { key: 'experience', label: 'Work Experience Section', check: !result.ruleViolations?.includes('No experience section') },
                  { key: 'skills', label: 'Technical Skills Section', check: !result.ruleViolations?.includes('No skills section') }
                ].map((rule) => (
                  <div key={rule.key} className="flex align-center justify-between" style={{ fontSize: '13px' }}>
                    <span className="flex align-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: rule.check ? 'var(--success)' : 'var(--danger)',
                        display: 'inline-block'
                      }}></span>
                      {rule.label}
                    </span>
                    <span className={`tag ${rule.check ? 'tag-matched' : 'tag-missing'}`}>
                      {rule.check ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5: AI Feedback & Recommendations */}
            <div className="card flex-col gap-3">
              <div className="flex align-center gap-2 justify-between">
                <h3 className="card-title flex align-center gap-2" style={{ margin: 0 }}>
                  <BotIcon size={16} style={{ color: 'var(--primary)' }} />
                  AI Feedback
                </h3>
              </div>
              <div className="feedback-sub-tabs flex gap-2">
                <button 
                  onClick={() => setActiveFeedbackTab('summary')}
                  className={`feedback-tab-btn ${activeFeedbackTab === 'summary' ? 'active' : ''}`}
                >
                  Summary
                </button>
                <button 
                  onClick={() => setActiveFeedbackTab('strengths')}
                  className={`feedback-tab-btn ${activeFeedbackTab === 'strengths' ? 'active' : ''}`}
                >
                  Strengths
                </button>
                <button 
                  onClick={() => setActiveFeedbackTab('improvements')}
                  className={`feedback-tab-btn ${activeFeedbackTab === 'improvements' ? 'active' : ''}`}
                >
                  Improvements
                </button>
                <button 
                  onClick={() => setActiveFeedbackTab('advice')}
                  className={`feedback-tab-btn ${activeFeedbackTab === 'advice' ? 'active' : ''}`}
                >
                  Advice
                </button>
              </div>
              <div className="feedback-content" style={{ minHeight: '140px' }}>
                {activeFeedbackTab === 'summary' && (
                  <div className="flex-col gap-2 fade-in">
                    <p className="feedback-paragraph" style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                      {result.feedback?.summary}
                    </p>
                  </div>
                )}
                {activeFeedbackTab === 'strengths' && (
                  <ul className="feedback-list flex-col gap-2 fade-in" style={{ padding: 0, margin: 0, fontSize: '13px' }}>
                    {result.feedback?.strengths?.map((str, idx) => (
                      <li key={idx} className="flex align-start gap-2" style={{ padding: '2px 0' }}>
                        <CheckIcon size={14} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ color: 'var(--text-primary)' }}>{str}</span>
                      </li>
                    )) || <li style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No strengths identified.</li>}
                  </ul>
                )}
                {activeFeedbackTab === 'improvements' && (
                  <ul className="feedback-list flex-col gap-2 fade-in" style={{ padding: 0, margin: 0, fontSize: '13px' }}>
                    {result.feedback?.improvements?.map((imp, idx) => (
                      <li key={idx} className="flex align-start gap-2" style={{ padding: '2px 0' }}>
                        <AlertIcon size={14} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ color: 'var(--text-primary)' }}>{imp}</span>
                      </li>
                    )) || <li style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No improvements identified.</li>}
                  </ul>
                )}
                {activeFeedbackTab === 'advice' && (
                  <div className="flex-col gap-2 fade-in">
                    <p className="feedback-paragraph" style={{ fontStyle: 'italic', color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                      {result.feedback?.careerAdvice || 'No career advice generated for this scan.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .workspace {
          width: 100%;
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

        .file-icon-wrapper {
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          width: 50px;
          height: 50px;
        }

        .file-name {
          font-family: var(--font-primary);
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
          max-width: 220px;
        }

        .file-size {
          font-size: 12px;
        }

        .jd-textarea {
          flex: 1;
          min-height: 120px;
          resize: none;
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

        .feedback-sub-tabs {
          border-bottom: 1px solid var(--border);
          padding-bottom: 6px;
        }

        .feedback-tab-btn {
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          padding: 6px 12px;
          cursor: pointer;
          transition: color var(--transition-speed) ease, border-color var(--transition-speed) ease;
        }

        .feedback-tab-btn:hover {
          color: var(--text-primary);
        }

        .feedback-tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .feedback-paragraph {
          font-family: var(--font-secondary);
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        .feedback-list {
          list-style: none;
          font-family: var(--font-secondary);
          font-size: 14px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
