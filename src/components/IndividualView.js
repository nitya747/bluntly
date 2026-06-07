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
  ChevronLeftIcon,
  DownloadIcon,
  ClockIcon,
  ConfigureIcon
} from './Icons';

function highlightJSON(json) {
  if (!json) return '';
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
    let cls = 'number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'key';
      } else {
        cls = 'string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'boolean';
    } else if (/null/.test(match)) {
      cls = 'null';
    }
    return '<span class="json-' + cls + '">' + match + '</span>';
  });
}

export default function IndividualView({ 
  onAddHistory, 
  selectedAnalysis, 
  credits, 
  setCredits, 
  history = [],
  activeSection,
  setActiveSection
}) {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeReportTab, setActiveReportTab] = useState('overview'); // 'overview', 'detailed', 'ai-feedback', 'matched', 'similarity'
  const [activeFeedbackTab, setActiveFeedbackTab] = useState('summary');
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const handleCopyJSON = () => {
    if (result && result.structuredResume) {
      navigator.clipboard.writeText(JSON.stringify(result.structuredResume, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Load selected analysis if loaded from history
  useEffect(() => {
    if (selectedAnalysis) {
      const timer = setTimeout(() => {
        setResult({
          ...selectedAnalysis.analysis,
          timestamp: selectedAnalysis.timestamp
        });
        setJobDescription(selectedAnalysis.analysis.jobDescription || '');
        setFile({ name: selectedAnalysis.filename, size: 0, isSavedRecord: true });
        setError(null);
        setActiveSection('analysis');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedAnalysis]);

  // Handle outside click to close export dropdown
  useEffect(() => {
    if (!showExportDropdown) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showExportDropdown]);

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

      // Attach job description to the returned analysis object
      const fullAnalysis = {
        ...data.analysis,
        jobDescription: jobDescription
      };

      setResult(fullAnalysis);
      if (data.credits !== undefined) {
        setCredits(data.credits);
      }
      
      // Save to global history
      onAddHistory({
        id: fullAnalysis.id,
        filename: file.name,
        analysis: fullAnalysis,
        timestamp: fullAnalysis.timestamp || new Date().toLocaleTimeString(),
      });

      // Automatically switch to the Analysis Report screen
      setActiveSection('analysis');
      setActiveReportTab('overview');
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
    setActiveReportTab('overview');
  };

  // Helper for progress bar color
  const getProgressColorClass = (score) => {
    if (score >= 80) return 'success';
    if (score >= 65) return 'warning';
    return 'danger';
  };

  const getStatusLabel = (score) => {
    if (score >= 70) return 'Good';
    return 'Needs Improvement';
  };

  // Keyword Match Score
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
    
    const sorted = [...history].sort((a, b) => {
      const scoreA = a.analysis?.atsScore ?? a.analysis?.qualityScore ?? 0;
      const scoreB = b.analysis?.atsScore ?? b.analysis?.qualityScore ?? 0;
      return scoreB - scoreA;
    });

    const index = sorted.findIndex(item => item.id === result.id || item.analysis?.id === result.id);
    const rank = index !== -1 ? index + 1 : 1;
    return { rank, total: history.length };
  };

  // Extract professional title from job description or skills fallback
  const getJobTitle = (scan) => {
    const jd = scan?.analysis?.jobDescription || scan?.jobDescription || jobDescription || '';
    if (jd) {
      const match = jd.match(/(?:looking for a|position:|role:|job title:)\s*([a-zA-Z\s\+\#]+)(?:\.|\n|with|at|for)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
      const firstWords = jd.split(/\s+/).slice(0, 3).join(' ');
      if (firstWords) return firstWords;
    }
    
    const experience = scan?.analysis?.structuredResume?.experience || result?.structuredResume?.experience || [];
    if (experience.length > 0 && experience[0].role) {
      return experience[0].role;
    }
    
    return 'Software Developer';
  };

  const rankingInfo = getOverallRanking();
  const keywordScore = getKeywordMatchScore();
  const individualScans = history.slice(0, 5); // Last 5 scans

  // Fallback Mockup Data constants
  const matchedSkillsFallback = ['React.js', 'JavaScript', 'HTML', 'CSS', 'Node.js', 'Git', 'GitHub', 'REST API'];
  const missingSkillsFallback = ['Next.js', 'TypeScript', 'Tailwind CSS', 'GraphQL', 'AWS', 'Docker', 'CI/CD', 'Jest'];

  // Check if result has skills, else use fallbacks
  const hasMatchedSkills = result?.skills?.matched && result.skills.matched.length > 0;
  const hasMissingSkills = result?.skills?.missing && result.skills.missing.length > 0;

  const matchedSkills = hasMatchedSkills ? result.skills.matched : matchedSkillsFallback;
  const missingSkills = hasMissingSkills ? result.skills.missing : missingSkillsFallback;

  const displayMatchedCount = hasMatchedSkills ? result.skills.matched.length : 18;
  const displayMissingCount = hasMissingSkills ? result.skills.missing.length : 14;
  const displayTotalCount = hasMatchedSkills && hasMissingSkills 
    ? (result.skills.matched.length + result.skills.missing.length) 
    : 64;
  const displayKeywordScore = hasMatchedSkills && hasMissingSkills
    ? (displayTotalCount > 0 ? Math.round((displayMatchedCount / displayTotalCount) * 100) : 0)
    : 28;

  const displayRankPercent = result?.atsScore !== null && result?.atsScore !== undefined
    ? (Math.max(10, Math.round(100 - (rankingInfo.total - rankingInfo.rank + 1) * (100 / rankingInfo.total))) || 68)
    : 68;

  // Rule violations fallback
  const ruleViolations = result?.ruleViolations && result.ruleViolations.length > 0
    ? result.ruleViolations
    : ['No skills section'];

  // AI Feedback fallbacks
  const feedbackSummary = result?.feedback?.summary || "The resume shows a decent alignment with the Software Engineering Intern role. The candidate has relevant skills and education, but the experience section lacks depth and measurable impact. Improving keyword usage and adding more quantifiable achievements will significantly boost the ATS score.";
  
  const feedbackStrengths = result?.feedback?.strengths && result.feedback.strengths.length > 0
    ? result.feedback.strengths
    : [
        "Good foundation of industry experience with a clear career progression.",
        "Clear section separation and structural layout."
      ];
      
  const feedbackImprovements = result?.feedback?.improvements && result.feedback.improvements.length > 0
    ? result.feedback.improvements
    : [
        "Quantify achievements: include metrics, scale, or percentage improvements in role descriptions.",
        "Tailor bullet points to explicitly match technologies requested in target job descriptions."
      ];
      
  const feedbackCareerAdvice = result?.feedback?.careerAdvice || "To progress to more senior positions, aim to lead projects or design architectures. Document those scale and design contributions clearly in your project listings.";
  
  const feedbackWordingImprovements = result?.feedback?.wordingImprovements && result.feedback.wordingImprovements.length > 0
    ? result.feedback.wordingImprovements
    : [
        "Collaborated with cross-functional teams to design, develop, and deploy features.",
        "Utilized modern tools and frameworks to optimize workflow efficiency and code quality."
      ];

  const exportPDF = () => {
    window.print();
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadReport = () => {
    const jsonString = JSON.stringify(result, null, 2);
    downloadFile(jsonString, `${(result.candidateName || 'candidate').replace(/\s+/g, '_')}_analysis_report.json`, 'application/json;charset=utf-8;');
  };

  const exportCSV = () => {
    if (!result) return;
    const data = [
      ['Metric', 'Value'],
      ['Candidate Name', result.candidateName || file?.name || 'N/A'],
      ['Job Title / Description', result.jobDescription || 'N/A'],
      ['ATS Match Score (%)', result.atsScore !== null && result.atsScore !== undefined ? `${result.atsScore}%` : 'N/A'],
      ['Quality Score (%)', result.qualityScore !== null && result.qualityScore !== undefined ? `${result.qualityScore}%` : 'N/A'],
      ['Overall Rank', `Better than ${displayRankPercent}% (Rank ${rankingInfo.rank} of ${rankingInfo.total})`],
      ['Matched Skills', (result.skills?.matched || []).join('; ')],
      ['Missing Skills', (result.skills?.missing || []).join('; ')],
      ['Experience Score (%)', result.sections?.experience || 0],
      ['Education Score (%)', result.sections?.education || 0],
      ['Skills Score (%)', result.sections?.skills || 0],
      ['Formatting Score (%)', result.sections?.formatting || 0],
      ['Impact Score (%)', result.sections?.impact || 0],
      ['Rule Violations', (result.ruleViolations || []).join('; ')],
      ['Passed Rules', (result.passedRules || []).join('; ')]
    ];
    const csvContent = data.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csvContent, `${(result.candidateName || 'candidate').replace(/\s+/g, '_')}_analysis_report.csv`, 'text/csv;charset=utf-8;');
  };

  const exportMarkdown = () => {
    if (!result) return;
    const md = `# Resume Analysis Report - ${result.candidateName || file?.name || 'Candidate'}
- **Job Title/Description Target**: ${result.jobDescription || 'N/A'}
- **Date Analyzed**: ${result.timestamp || new Date().toLocaleString()}

## Overall Scores
- **ATS Match Score**: ${result.atsScore !== null && result.atsScore !== undefined ? result.atsScore : 'N/A'}%
- **Resume Quality Score**: ${result.qualityScore || 0}%
- **Ranking**: Better than ${displayRankPercent}% of resumes (${rankingInfo.rank} of ${rankingInfo.total})

## Section Scores
- **Experience**: ${result.sections?.experience || 0}%
- **Education**: ${result.sections?.education || 0}%
- **Skills**: ${result.sections?.skills || 0}%
- **Formatting**: ${result.sections?.formatting || 0}%
- **Impact**: ${result.sections?.impact || 0}%

## Skills Analysis
### Matched Skills (${result.skills?.matched?.length || 0})
${(result.skills?.matched || []).map(s => `- ${s}`).join('\n') || '*None*'}

### Missing Skills (${result.skills?.missing?.length || 0})
${(result.skills?.missing || []).map(s => `- ${s}`).join('\n') || '*None*'}

## AI Feedback & Recommendations
### Executive Summary
${result.feedback?.summary || 'N/A'}

### Strengths
${(result.feedback?.strengths || []).map(s => `- ${s}`).join('\n') || '*None*'}

### Areas for Improvement
${(result.feedback?.improvements || []).map(s => `- ${s}`).join('\n') || '*None*'}

### Career Advice
${result.feedback?.careerAdvice || 'N/A'}

### Suggested Bullet Point Optimizations
${(result.feedback?.wordingImprovements || []).map(s => `- ${s}`).join('\n') || '*None*'}

## Rule Compliance
### Passed Checks
${(result.passedRules || []).map(r => `- ✓ ${r}`).join('\n') || '*None*'}

### Violations
${(result.ruleViolations || []).map(r => `- ✕ ${r}`).join('\n') || '*None*'}
`;
    downloadFile(md, `${(result.candidateName || 'candidate').replace(/\s+/g, '_')}_analysis_report.md`, 'text/plain;charset=utf-8;');
  };

  return (
    <div className="workspace flex-col gap-6 fade-in">
      {/* 1. Configure Screen Pattern */}
      {activeSection === 'input' && (
        <div className="flex-col gap-8 fade-in">
          <div className="grid grid-cols-2 gap-8">
            {/* Resume Upload Card */}
            <div className="card">
              <div className="flex justify-between align-center">
                <h3 className="card-title">Resume Upload</h3>
                {file && (
                  <button onClick={clearFile} className="button-secondary sample-btn flex align-center gap-2" style={{ padding: '6px 12px', borderRadius: '8px' }}>
                    <XIcon size={13} />
                    <span>Clear File</span>
                  </button>
                )}
              </div>
              <div className="card-divider"></div>
              
              <div 
                className={`dropzone-area flex-col align-center justify-center gap-3 ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ backgroundColor: 'rgba(15, 118, 110, 0.02)', border: '2px dashed var(--border)' }}
              >
                {file ? (
                  <div className="file-details flex-col align-center gap-3 w-full p-4">
                    <div className="file-icon-wrapper flex align-center justify-center" style={{ backgroundColor: 'var(--danger-subtle)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                      <FileTextIcon size={24} style={{ color: '#EF4444' }} />
                    </div>
                    <div className="file-info flex-col align-center text-center">
                      <span className="file-name truncate" style={{ fontWeight: '700' }}>{file.name}</span>
                      {file.isSavedRecord ? (
                        <span className="file-size text-secondary">Saved Session Scan</span>
                      ) : (
                        <span className="file-size text-secondary">{Math.round(file.size / 1024)} KB</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <label className="upload-box flex-col align-center justify-center gap-3 cursor-pointer">
                    <input type="file" onChange={handleFileChange} accept=".pdf,.tex,.txt" style={{ display: 'none' }} />
                    <div className="upload-icon-wrapper flex align-center justify-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <UploadIcon size={24} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="flex-col align-center text-center">
                      <span className="upload-title" style={{ fontSize: '15px', fontWeight: '700' }}>Drag and drop your file here</span>
                      <span className="upload-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>PDF only. Max size 10MB</span>
                    </div>
                    <span className="button-secondary flex align-center gap-2" style={{ backgroundColor: 'var(--surface)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
                      <UploadIcon size={14} /> Choose File
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Job Description Card */}
            <div className="card">
              <div className="flex justify-between align-center">
                <h3 className="card-title">Job Description</h3>
                <button onClick={loadSampleJD} className="button-secondary sample-btn flex align-center gap-2" style={{ padding: '6px 12px', borderRadius: '8px' }}>
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
                  style={{ minHeight: '160px' }}
                />
                <div className="jd-stats flex justify-between font-sans text-secondary" style={{ fontSize: '12px' }}>
                  <span>{jobDescription.split(/\s+/).filter(Boolean).length} words</span>
                  <span>{jobDescription.length} characters</span>
                </div>
              </div>
            </div>
          </div>

          {/* Credit warnings */}
          {file && !file.isSavedRecord && credits < 1 && (
            <div className="credit-warning-banner card flex align-center gap-3" style={{ alignSelf: 'center', maxWidth: '500px', width: '100%', borderColor: 'var(--danger)', backgroundColor: 'rgba(239,68,68,0.06)', color: 'var(--danger)' }}>
              <span className="error-icon flex align-center">⚠️</span>
              <span className="error-message font-sans" style={{ fontSize: '13px' }}>
                Insufficient credits. This scan requires <strong>1 credit</strong>, but you have <strong>0 credits</strong> remaining. Please buy credits in the sidebar.
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

          {/* Analyze Button & Cost */}
          <div className="flex-col align-center gap-2" style={{ marginTop: '8px' }}>
            <button
              onClick={runAnalysis}
              disabled={!file || analyzing || credits === 0}
              className="button-primary run-analysis-btn flex align-center justify-center gap-2"
              style={{ width: '320px', height: '48px', backgroundColor: 'var(--primary)', borderRadius: '12px' }}
            >
              {analyzing ? (
                <>
                  <SettingsIcon size={16} className="spin-animation" />
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <SearchIcon size={16} style={{ color: '#FFFFFF' }} />
                  Analyze Resume
                </>
              )}
            </button>
            <span className="cost-subtext" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {file?.isSavedRecord 
                ? 'Viewing saved scan' 
                : `Costs 1 credit — You have ${credits} credits remaining`}
            </span>
          </div>

          {/* Recent Analyses Table */}
          <div className="card">
            <div className="flex justify-between align-center">
              <h3 className="card-title flex align-center gap-2" style={{ fontSize: '16px' }}>
                <ClockIcon size={16} style={{ color: 'var(--text-secondary)' }} />
                <span>Recent Analyses</span>
              </h3>
              <button onClick={() => setActiveSection('history')} className="submenu-btn" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
                View All &gt;
              </button>
            </div>
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
                      <th>Resume Name</th>
                      <th>Job Title</th>
                      <th>ATS Score</th>
                      <th>Quality Score</th>
                      <th>Analyzed On</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {individualScans.map((scan) => {
                      const atsScoreVal = scan.analysis?.atsScore;
                      const qualityScoreVal = scan.analysis?.qualityScore || 0;
                      return (
                        <tr key={scan.id}>
                          <td style={{ fontWeight: '700' }} className="flex align-center gap-2">
                            <FileTextIcon size={16} style={{ color: '#EF4444', marginRight: '4px' }} />
                            <span>{scan.filename}</span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{getJobTitle(scan)}</td>
                          <td>
                            <span 
                              className="tag"
                              style={{ 
                                backgroundColor: atsScoreVal >= 80 ? 'var(--success-subtle)' : atsScoreVal >= 65 ? 'var(--warning-subtle)' : 'var(--danger-subtle)',
                                color: atsScoreVal >= 80 ? 'var(--success)' : atsScoreVal >= 65 ? 'var(--warning)' : 'var(--danger)',
                                fontWeight: '700'
                              }}
                            >
                              {atsScoreVal !== null && atsScoreVal !== undefined ? `${atsScoreVal}%` : 'N/A'}
                            </span>
                          </td>
                          <td>
                            <span 
                              className="tag"
                              style={{ 
                                backgroundColor: qualityScoreVal >= 80 ? 'var(--success-subtle)' : qualityScoreVal >= 65 ? 'var(--warning-subtle)' : 'var(--danger-subtle)',
                                color: qualityScoreVal >= 80 ? 'var(--success)' : qualityScoreVal >= 65 ? 'var(--warning)' : 'var(--danger)',
                                fontWeight: '700'
                              }}
                            >
                              {qualityScoreVal}%
                            </span>
                          </td>
                          <td className="text-secondary">{scan.timestamp || 'Today, 10:30 AM'}</td>
                          <td>
                            <div className="flex align-center gap-2">
                              <button
                                onClick={() => loadRecentScan(scan)}
                                className="button-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', fontWeight: '600' }}
                              >
                                View Report
                              </button>
                              <button className="header-icon-btn" style={{ padding: '4px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="12" cy="5" r="1" />
                                  <circle cx="12" cy="19" r="1" />
                                </svg>
                              </button>
                            </div>
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

      {/* 2. Analysis Report Screen Pattern */}
      {activeSection === 'analysis' && result && (
        <div className="flex-col gap-6 fade-in analysis-report-container">

          {/* Document Header block */}
          <div className="doc-header-block flex justify-between align-center w-full" style={{ border: 'none', backgroundColor: 'transparent' }}>
            <div className="flex align-center gap-4">
              <svg className="pdf-icon-svg" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 2H28L38 12V44C38 45.1 37.1 46 36 46H4C2.9 46 2 45.1 2 44V4C2 2.9 2.9 2 4 2Z" fill="var(--surface)" stroke="#EF4444" strokeWidth="2.5" strokeLinejoin="round"/>
                <path d="M28 2V12H38L28 2Z" fill="var(--surface)" stroke="#EF4444" strokeWidth="2.5" strokeLinejoin="round"/>
                <text x="20" y="32" fill="#EF4444" fontSize="11" fontWeight="900" fontFamily="var(--font-primary)" textAnchor="middle" letterSpacing="0.5">PDF</text>
              </svg>
              <div className="flex-col text-left" style={{ gap: '4px' }}>
                <h2 className="doc-header-title font-primary" style={{ fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{file?.name || 'Resume.pdf'}</h2>
                <span className="doc-header-subtitle text-secondary" style={{ fontWeight: '500' }}>
                  {getJobTitle()} <span style={{ margin: '0 8px', color: 'var(--border)' }}>•</span> Analyzed on {result.timestamp || 'May 14, 2025 at 10:30 AM'}
                </span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex align-center gap-3 export-dropdown-container" style={{ position: 'relative' }}>
              <button onClick={exportPDF} className="actions-btn button-secondary flex align-center gap-2" style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', fontWeight: '600', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <polyline points="16 13 12 9 8 13" />
                  <line x1="12" y1="9" x2="12" y2="17" />
                </svg>
                <span>Export PDF</span>
              </button>
              <button onClick={downloadReport} className="actions-btn button-secondary flex align-center gap-2" style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', fontWeight: '600', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <DownloadIcon size={14} />
                <span>Download Report</span>
              </button>
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="dropdown-btn button-secondary flex align-center justify-center" 
                style={{ backgroundColor: 'var(--surface)', padding: '0', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-primary)', width: '36px', height: '36px', cursor: 'pointer' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1.25" fill="currentColor"/>
                  <circle cx="12" cy="5" r="1.25" fill="currentColor"/>
                  <circle cx="12" cy="19" r="1.25" fill="currentColor"/>
                </svg>
              </button>

              {showExportDropdown && (
                <div className="card fade-in" style={{
                  position: 'absolute',
                  right: 0,
                  top: '42px',
                  width: '180px',
                  zIndex: 100,
                  padding: '8px',
                  gap: '4px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <button 
                    onClick={() => { exportCSV(); setShowExportDropdown(false); }}
                    className="submenu-btn flex align-center gap-2 w-full text-left" 
                    style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
                  >
                    <DownloadIcon size={14} style={{ marginRight: '6px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Export CSV</span>
                  </button>
                  <button 
                    onClick={() => { exportMarkdown(); setShowExportDropdown(false); }}
                    className="submenu-btn flex align-center gap-2 w-full text-left" 
                    style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
                  >
                    <DownloadIcon size={14} style={{ marginRight: '6px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Export Markdown</span>
                  </button>
                  <button 
                    onClick={() => { downloadReport(); setShowExportDropdown(false); }}
                    className="submenu-btn flex align-center gap-2 w-full text-left" 
                    style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
                  >
                    <DownloadIcon size={14} style={{ marginRight: '6px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Export JSON</span>
                  </button>
                  <button 
                    onClick={() => { exportPDF(); setShowExportDropdown(false); }}
                    className="submenu-btn flex align-center gap-2 w-full text-left" 
                    style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
                  >
                    <DownloadIcon size={14} style={{ marginRight: '6px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Export PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Report Subtabs Navigation */}
          <div className="tabs-navigation">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'detailed', label: 'Detailed Analysis' },
              { id: 'ai-feedback', label: 'AI Feedback' },
              { id: 'matched', label: 'Matched Resume' },
              { id: 'similarity', label: 'Similarity Check' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveReportTab(tab.id)}
                className={`tab-nav-btn ${activeReportTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab Content */}
          {activeReportTab === 'overview' && (
            <div className="flex-col gap-4 w-full">
              {/* Section 1: KPI Cards */}
              <div className="grid grid-cols-4 gap-8">
                {/* ATS Match Score */}
                <div className="kpi-card">
                  <div className="flex align-center justify-between">
                    <span className="kpi-title" style={{ display: 'flex', alignItems: 'center' }}>
                      ATS Match Score
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', opacity: 0.5 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </span>
                  </div>
                  
                  <div className="flex-col text-left" style={{ margin: '2px 0 4px 0' }}>
                    <div className="flex align-baseline">
                      <span className="kpi-score" style={{ color: (result.atsScore !== null && result.atsScore !== undefined ? result.atsScore : 37) >= 70 ? 'var(--success)' : 'var(--danger)' }}>
                        {result.atsScore !== null && result.atsScore !== undefined ? result.atsScore : '37'}
                      </span>
                      <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginLeft: '2px' }}>/ 100</span>
                    </div>
                    <span className="kpi-status" style={{ color: (result.atsScore !== null && result.atsScore !== undefined ? result.atsScore : 37) >= 70 ? 'var(--success)' : 'var(--danger)', fontWeight: '700', marginTop: '2px' }}>
                      {result.atsScore !== null && result.atsScore !== undefined ? getStatusLabel(result.atsScore) : 'Needs Improvement'}
                    </span>
                  </div>

                  <div className="progress-bar-track" style={{ height: '5px', backgroundColor: 'rgba(148, 163, 184, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${result.atsScore !== null && result.atsScore !== undefined ? result.atsScore : 37}%`, 
                        height: '100%',
                        backgroundColor: (result.atsScore !== null && result.atsScore !== undefined ? result.atsScore : 37) >= 70 ? 'var(--success)' : 'var(--danger)',
                        borderRadius: '999px'
                      }}
                    ></div>
                  </div>
                </div>

                {/* Resume Quality */}
                <div className="kpi-card">
                  <div className="flex align-center justify-between">
                    <span className="kpi-title" style={{ display: 'flex', alignItems: 'center' }}>
                      Resume Quality Score
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', opacity: 0.5 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </span>
                  </div>

                  <div className="flex-col text-left" style={{ margin: '2px 0 4px 0' }}>
                    <div className="flex align-baseline">
                      <span className="kpi-score" style={{ color: (result.qualityScore || 70) >= 70 ? 'var(--success)' : 'var(--danger)' }}>
                        {result.qualityScore !== null && result.qualityScore !== undefined ? result.qualityScore : '70'}
                      </span>
                      <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginLeft: '2px' }}>/ 100</span>
                    </div>
                    <span className="kpi-status" style={{ color: (result.qualityScore || 70) >= 70 ? 'var(--success)' : 'var(--danger)', fontWeight: '700', marginTop: '2px' }}>
                      {getStatusLabel(result.qualityScore || 70)}
                    </span>
                  </div>

                  <div className="progress-bar-track" style={{ height: '5px', backgroundColor: 'rgba(148, 163, 184, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${result.qualityScore !== null && result.qualityScore !== undefined ? result.qualityScore : 70}%`, 
                        height: '100%',
                        backgroundColor: (result.qualityScore || 70) >= 70 ? 'var(--success)' : 'var(--danger)',
                        borderRadius: '999px'
                      }}
                    ></div>
                  </div>
                </div>

                {/* Keyword Match */}
                <div className="kpi-card">
                  <div className="flex align-center justify-between">
                    <span className="kpi-title" style={{ display: 'flex', alignItems: 'center' }}>
                      Keyword Match
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', opacity: 0.5 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </span>
                  </div>

                  <div className="flex-col text-left" style={{ margin: '2px 0 4px 0' }}>
                    <span className="kpi-score" style={{ color: 'var(--primary)' }}>
                      {displayKeywordScore}%
                    </span>
                    <span className="kpi-status" style={{ fontWeight: '600', marginTop: '4px' }}>
                      {displayMatchedCount} / {displayTotalCount} Matched
                    </span>
                  </div>

                  <div className="progress-bar-track" style={{ height: '5px', backgroundColor: 'rgba(148, 163, 184, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${displayKeywordScore}%`, 
                        height: '100%',
                        backgroundColor: 'var(--primary)',
                        borderRadius: '999px'
                      }}
                    ></div>
                  </div>
                </div>

                {/* Overall Ranking */}
                <div className="kpi-card">
                  <div className="flex align-center justify-between">
                    <span className="kpi-title" style={{ display: 'flex', alignItems: 'center' }}>
                      Overall Ranking
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', opacity: 0.5 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </span>
                  </div>

                  <div className="flex-col text-left" style={{ margin: '2px 0 4px 0' }}>
                    <span className="kpi-score" style={{ color: 'var(--warning)' }}>
                      Top {displayRankPercent}%
                    </span>
                    <span className="kpi-status" style={{ fontWeight: '600', marginTop: '4px' }}>
                      Better than {displayRankPercent}% of resumes
                    </span>
                  </div>

                  <div className="progress-bar-track" style={{ height: '5px', backgroundColor: 'rgba(148, 163, 184, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${displayRankPercent}%`, 
                        height: '100%',
                        backgroundColor: 'var(--warning)',
                        borderRadius: '999px'
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Grid layout for Breakdown and Skills */}
              <div className="grid grid-cols-2 gap-4">
                {/* Section Breakdown */}
                <div className="card" style={{ padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                  <div className="flex align-center justify-between" style={{ marginBottom: '8px' }}>
                    <div className="flex align-center gap-1.5 justify-start">
                      <h3 className="card-title" style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Section Breakdown</h3>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)', opacity: 0.5, cursor: 'pointer' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-col gap-2" style={{ marginTop: '4px' }}>
                    {['experience', 'education', 'skills', 'formatting', 'impact'].map((key) => {
                      // Get score with mockup fallback if missing
                      const score = result.sections?.[key] !== undefined && result.sections?.[key] !== null
                        ? result.sections[key]
                        : (key === 'experience' ? 30 : key === 'education' ? 90 : key === 'skills' ? 80 : key === 'formatting' ? 100 : 55);

                      // Lookup config for icons
                      let icon = null;
                      let label = key;
                      if (key.toLowerCase() === 'experience') {
                        label = 'Experience';
                        icon = (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                          </svg>
                        );
                      } else if (key.toLowerCase() === 'education') {
                        label = 'Education';
                        icon = (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                          </svg>
                        );
                      } else if (key.toLowerCase() === 'skills') {
                        label = 'Skills';
                        icon = (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                          </svg>
                        );
                      } else if (key.toLowerCase() === 'formatting') {
                        label = 'Formatting';
                        icon = (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        );
                      } else if (key.toLowerCase() === 'impact') {
                        label = 'Impact';
                        icon = (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                          </svg>
                        );
                      }

                      return (
                        <div key={key} className="flex align-center w-full gap-4" style={{ margin: '2px 0' }}>
                          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', flexShrink: 0 }}>
                            {icon}
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', width: '90px', textAlign: 'left', flexShrink: 0 }}>
                            {label}
                          </span>
                          <div className="flex-1 progress-bar-track" style={{ height: '6px', backgroundColor: 'rgba(148, 163, 184, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div 
                              className="progress-bar-fill" 
                              style={{ 
                                width: `${score}%`, 
                                height: '100%',
                                backgroundColor: score >= 70 ? 'var(--success)' : 'var(--warning)',
                                borderRadius: '999px'
                              }}
                            ></div>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: '700', width: '70px', textAlign: 'right', flexShrink: 0, fontFamily: 'var(--font-primary)' }}>
                            <span style={{ color: score >= 70 ? 'var(--success)' : 'var(--warning)' }}>{score}</span>
                            <span style={{ color: '#94A3B8' }}> / 100</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-center w-full" style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <button 
                      onClick={() => setActiveReportTab('detailed')} 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--primary)', 
                        fontWeight: '700', 
                        fontSize: '13px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-primary)'
                      }}
                    >
                      <span>View Detailed Analysis</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Keywords & Skills Analysis */}
                <div className="card" style={{ padding: '24px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="flex align-center justify-between" style={{ marginBottom: '16px' }}>
                    <div className="flex align-center gap-1.5 justify-start">
                      <h3 className="card-title" style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Keywords & Skills Analysis</h3>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)', opacity: 0.5, cursor: 'pointer' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 flex-1" style={{ marginTop: '12px', marginBottom: '16px' }}>
                    {/* Matched Skills */}
                    <div className="flex flex-col gap-4 text-left">
                      <span className="font-sans" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--success)', display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                          <circle cx="12" cy="12" r="10" fill="var(--success-subtle)" />
                          <polyline points="16 9 11 14 8 11" />
                        </svg>
                        Matched Skills ({displayMatchedCount})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {matchedSkills.slice(0, 8).map((s, idx) => (
                          <span key={idx} style={{ backgroundColor: 'var(--success-subtle)', color: 'var(--success)', padding: '5px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center' }}>{s}</span>
                        ))}
                        {!hasMatchedSkills && (
                          <span style={{ backgroundColor: 'var(--success-subtle)', color: 'var(--success)', padding: '5px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center' }}>+10 more</span>
                        )}
                        {hasMatchedSkills && result.skills?.matched?.length > 8 && (
                          <span style={{ backgroundColor: 'var(--success-subtle)', color: 'var(--success)', padding: '5px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center' }}>+{(result.skills.matched.length - 8)} more</span>
                        )}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div className="flex flex-col gap-4 text-left">
                      <span className="font-sans" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--danger)', display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                          <circle cx="12" cy="12" r="10" fill="var(--danger-subtle)" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        Missing Skills ({displayMissingCount})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {missingSkills.slice(0, 8).map((s, idx) => (
                          <span key={idx} style={{ backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)', padding: '5px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center' }}>{s}</span>
                        ))}
                        {!hasMissingSkills && (
                          <span style={{ backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)', padding: '5px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center' }}>+6 more</span>
                        )}
                        {hasMissingSkills && result.skills?.missing?.length > 8 && (
                          <span style={{ backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)', padding: '5px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center' }}>+{(result.skills.missing.length - 8)} more</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center w-full" style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <button 
                      onClick={() => setActiveReportTab('detailed')} 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--primary)', 
                        fontWeight: '700', 
                        fontSize: '13px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-primary)'
                      }}
                    >
                      <span>View All Skills</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Third Row: Rule Checks & AI Summary */}
              <div className="grid grid-cols-2 gap-4">
                {/* Programmatic Rule Checks */}
                <div className="card" style={{ padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                  <div className="flex align-center justify-between" style={{ marginBottom: '8px' }}>
                    <div className="flex align-center gap-1.5 justify-start">
                      <h3 className="card-title" style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Programmatic Rule Checks</h3>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)', opacity: 0.5, cursor: 'pointer' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-col gap-1.5" style={{ marginTop: '4px' }}>
                    {[
                      { key: 'email', label: 'Email Address', check: !ruleViolations.includes('Missing email') },
                      { key: 'phone', label: 'Phone Number', check: !ruleViolations.includes('Missing phone') },
                      { key: 'length', label: 'Resume Length (1-2 pages)', check: !ruleViolations.includes('Resume too short') },
                      { key: 'experience', label: 'Section Headings', check: !ruleViolations.includes('No experience section') },
                      { key: 'skills', label: 'Skills Section', check: !ruleViolations.includes('No skills section') }
                    ].map((rule) => (
                      <div key={rule.key} className="flex align-center justify-between" style={{ fontSize: '13px', padding: '3px 0' }}>
                        <span className="flex align-center gap-2" style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '12px' }}>
                          {rule.check ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10" fill="var(--success-subtle)" />
                              <polyline points="16 9 11 14 8 11" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10" fill="var(--danger-subtle)" />
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                          )}
                          {rule.label}
                        </span>
                        <span 
                          style={{ 
                            backgroundColor: rule.check ? 'var(--success-subtle)' : 'var(--danger-subtle)',
                            color: rule.check ? 'var(--success)' : 'var(--danger)',
                            fontWeight: '700',
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontFamily: 'var(--font-primary)'
                          }}
                        >
                          {rule.check ? 'Passed' : 'Not Found'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center w-full" style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <button 
                      onClick={() => setActiveReportTab('similarity')} 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--primary)', 
                        fontWeight: '700', 
                        fontSize: '13px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-primary)'
                      }}
                    >
                      <span>View All Rules</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  </div>
                </div>                {/* AI Summary & Feedback */}
                <div className="card" style={{ padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                  <div className="flex align-center justify-between" style={{ marginBottom: '8px' }}>
                    <div className="flex align-center gap-1.5 justify-start">
                      <h3 className="card-title" style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>AI Summary & Feedback</h3>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)', opacity: 0.5, cursor: 'pointer' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-col gap-3" style={{ marginTop: '4px' }}>
                    {/* Capsule subtabs */}
                    <div className="flex align-center gap-2" style={{ marginBottom: '2px' }}>
                      {[
                        { id: 'summary', label: 'Summary' },
                        { id: 'strengths', label: 'Strengths' },
                        { id: 'improvements', label: 'Improvements' },
                        { id: 'advice', label: 'Career Advice' }
                      ].map((tab) => {
                        const isActive = activeFeedbackTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveFeedbackTab(tab.id)}
                            style={{
                              backgroundColor: 'var(--surface)',
                              border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                              fontWeight: isActive ? '700' : '500',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontFamily: 'var(--font-primary)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab contents */}
                    <div style={{ minHeight: '90px', padding: '4px 0' }}>
                      {activeFeedbackTab === 'summary' && (
                        <p style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)', margin: 0 }}>
                          {feedbackSummary}
                        </p>
                      )}

                      {activeFeedbackTab === 'strengths' && (
                        <ul className="flex-col gap-2 text-left" style={{ fontSize: '13px', listStyle: 'none', padding: 0, margin: 0 }}>
                          {feedbackStrengths?.map((str, idx) => (
                            <li key={idx} className="flex align-center gap-2" style={{ padding: '2px 0' }}>
                              <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                              <span style={{ color: 'var(--text-primary)' }}>{str}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {activeFeedbackTab === 'improvements' && (
                        <ul className="flex-col gap-2 text-left" style={{ fontSize: '13px', listStyle: 'none', padding: 0, margin: 0 }}>
                          {feedbackImprovements?.map((imp, idx) => (
                            <li key={idx} className="flex align-center gap-2" style={{ padding: '2px 0' }}>
                              <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>⚠️</span>
                              <span style={{ color: 'var(--text-primary)' }}>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {activeFeedbackTab === 'advice' && (
                        <p style={{ fontStyle: 'italic', textAlign: 'left', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)', margin: 0 }}>
                          {feedbackCareerAdvice}
                        </p>
                      )}
                    </div>

                    {/* Callout box: Key Recommendation */}
                    <div className="recommendation-box" style={{ marginTop: '8px' }}>
                      <div className="recommendation-icon" style={{
                        backgroundColor: 'rgba(20, 184, 166, 0.08)',
                        border: '1px solid rgba(20, 184, 166, 0.15)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        flexShrink: 0
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                          <path d="M9 18h6" />
                          <path d="M10 22h4" />
                        </svg>
                      </div>
                      <div className="recommendation-content" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className="recommendation-title" style={{ fontFamily: 'var(--font-primary)', fontSize: '12px', fontWeight: '700', color: 'var(--primary)', textAlign: 'left' }}>Key Recommendation</span>
                        <span className="recommendation-text" style={{ fontSize: '12px', lineHeight: '1.4', color: 'var(--text-primary)', textAlign: 'left', fontWeight: '500' }}>
                          Add more action verbs, quantify your achievements, and include missing keywords from the job description to improve your match score.
                        </span>
                      </div>
                    </div>
                  </div>
                </div></div>
              </div>
          )}

          {/* Detailed Analysis Tab Content */}
          {activeReportTab === 'detailed' && (
            <div className="card fade-in">
              <h3 className="card-title">Detailed Analysis Report</h3>
              <div className="card-divider"></div>
              
              <div className="grid grid-cols-2 gap-8 text-left" style={{ fontSize: '13px' }}>
                {/* Candidate details */}
                <div className="flex flex-col gap-5">
                  <div className="profile-hero-card" style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.05) 0%, rgba(20, 184, 166, 0.02) 100%)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      boxShadow: 'var(--shadow)'
                    }}>
                      {result.candidateName ? result.candidateName.charAt(0) : 'U'}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Candidate Profile</span>
                      <strong style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: '700' }}>{result.candidateName}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="profile-detail-item" style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <div className="flex-col text-left" style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>EMAIL</span>
                        <span className="truncate" style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '12px' }} title={result.structuredResume?.email || 'N/A'}>
                          {result.structuredResume?.email || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="profile-detail-item" style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <div className="flex-col text-left" style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>PHONE</span>
                        <span className="truncate" style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '12px' }} title={result.structuredResume?.phone || 'N/A'}>
                          {result.structuredResume?.phone || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="profile-detail-item" style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                      <div className="flex-col text-left" style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>EXPERIENCE</span>
                        <span className="truncate" style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '12px' }}>
                          {result.structuredResume?.experienceYears || 0} years
                        </span>
                      </div>
                    </div>

                    <div className="profile-detail-item" style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M22 10v6M2 10v6M12 2 2 7l10 5 10-5-10-5z" />
                        <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
                      </svg>
                      <div className="flex-col text-left" style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>EDUCATION</span>
                        <span className="truncate" style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '12px' }}>
                          {result.structuredResume?.education?.length || 0} Records
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h4 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Education History</h4>
                    {result.structuredResume?.education && result.structuredResume.education.length > 0 ? (
                      result.structuredResume.education.map((edu, idx) => (
                        <div key={idx} style={{
                          padding: '12px',
                          backgroundColor: 'var(--bg)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          borderLeft: '3px solid var(--primary)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          textAlign: 'left'
                        }}>
                          <p style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>{edu.degree || 'Degree'}</p>
                          <p className="text-secondary" style={{ fontSize: '12px' }}>
                            <strong>{edu.institution}</strong> • {edu.year}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div style={{
                        padding: '24px 16px',
                        backgroundColor: 'var(--bg)',
                        borderRadius: '12px',
                        border: '1px dashed var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: 'var(--text-secondary)'
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                          <path d="M22 10v6M2 10v6M12 2 2 7l10 5 10-5-10-5z" />
                          <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
                        </svg>
                        <span style={{ fontSize: '12px', fontWeight: '500' }}>No education history detected in resume</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Experience History */}
                <div className="flex flex-col gap-4">
                  <h4 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Work Experience Breakdown</h4>
                  <div className="flex-col gap-3 custom-scrollbar" style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '8px' }}>
                    {result.structuredResume?.experience && result.structuredResume.experience.length > 0 ? (
                      result.structuredResume.experience.map((exp, idx) => (
                        <div key={idx} className="experience-card" style={{
                          padding: '16px',
                          backgroundColor: 'var(--bg)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                          borderLeft: '4px solid var(--primary)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          position: 'relative'
                        }}>
                          <div className="flex justify-between align-center" style={{ marginBottom: '2px' }}>
                            <strong style={{ color: 'var(--primary)', fontSize: '13.5px', fontWeight: '700' }}>{exp.role}</strong>
                            <span className="font-mono text-secondary" style={{ fontSize: '11px', fontWeight: '600', backgroundColor: 'var(--surface)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                              {exp.duration || 'N/A'} {exp.years ? `(${exp.years} yrs)` : ''}
                            </span>
                          </div>
                          <p style={{ fontWeight: '600', fontSize: '12.5px', color: 'var(--text-primary)' }}>{exp.company}</p>
                          <p className="text-secondary" style={{ fontSize: '12.5px', lineHeight: '1.5', marginTop: '2px', textAlign: 'justify' }}>{exp.description}</p>
                        </div>
                      ))
                    ) : (
                      <div style={{
                        padding: '32px 16px',
                        backgroundColor: 'var(--bg)',
                        borderRadius: '12px',
                        border: '1px dashed var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: 'var(--text-secondary)'
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                        <span style={{ fontSize: '12px', fontWeight: '500' }}>No work experience detected in resume</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Feedback Tab Content */}
          {activeReportTab === 'ai-feedback' && (
            <div className="card fade-in text-left">
              <h3 className="card-title flex align-center gap-2">
                <SparklesIcon size={18} style={{ color: 'var(--primary)' }} />
                Comprehensive AI Career Feedback
              </h3>
              <div className="card-divider"></div>
              
              <div className="flex-col gap-6">
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.04) 0%, rgba(20, 184, 166, 0.01) 100%)',
                  border: '1px solid var(--border)',
                  borderLeft: '4px solid var(--primary)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '8px', fontSize: '14px' }}>Strategic Alignment Summary</h4>
                  <p className="feedback-paragraph" style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6' }}>{feedbackSummary}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <h4 style={{ fontWeight: '700', color: 'var(--success)', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--success-subtle)', color: 'var(--success)', fontSize: '11px', fontWeight: 'bold' }}>✓</span>
                      Bullet Point Rephrasing Suggestions
                    </h4>
                    <ul className="feedback-list flex-col gap-2.5" style={{ fontSize: '12.5px', listStyle: 'none', padding: 0 }}>
                      {feedbackWordingImprovements?.map((word, idx) => (
                        <li key={idx} className="flex align-start gap-2.5" style={{
                          padding: '10px 12px',
                          backgroundColor: 'var(--success-subtle)',
                          border: '1px solid rgba(16, 185, 129, 0.15)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)'
                        }}>
                          <span style={{ color: 'var(--success)', fontWeight: 'bold', marginTop: '2px' }}>✎</span>
                          <span style={{ lineHeight: '1.4' }}>{word}</span>
                        </li>
                      )) || <li>No phrasing suggestions generated.</li>}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3">
                    <h4 style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--success-subtle)', color: 'var(--primary)', fontSize: '11px', fontWeight: 'bold' }}>★</span>
                      Long-Term Career Progression Advice
                    </h4>
                    <div style={{
                      padding: '16px',
                      backgroundColor: 'rgba(20, 184, 166, 0.04)',
                      border: '1px solid rgba(20, 184, 166, 0.15)',
                      borderRadius: '12px',
                      height: '100%'
                    }}>
                      <p style={{
                        lineHeight: '1.6',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        fontStyle: 'italic',
                        borderLeft: '3px solid rgba(20, 184, 166, 0.4)',
                        paddingLeft: '12px'
                      }}>
                        &ldquo;{feedbackCareerAdvice}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Matched Resume Tab Content */}
          {activeReportTab === 'matched' && (
            <div className="card fade-in text-left">
              <div className="flex justify-between align-center" style={{ marginBottom: '4px' }}>
                <h3 className="card-title">Structured Resume Data Output</h3>
                <button
                  onClick={handleCopyJSON}
                  className="button-secondary flex align-center gap-1.5"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: copied ? 'var(--success-subtle)' : 'transparent',
                    borderColor: copied ? 'var(--success)' : 'var(--border)',
                    color: copied ? 'var(--success)' : 'var(--text-primary)'
                  }}
                >
                  {copied ? (
                    <>
                      <CheckIcon size={14} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>
              <div className="card-divider" style={{ margin: '8px 0 12px 0' }}></div>
              <p className="text-secondary" style={{ fontSize: '13px', marginBottom: '12px' }}>
                Below is the parsed structural JSON output extracted from the candidate file.
              </p>
              <pre 
                className="custom-scrollbar"
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '400px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
                dangerouslySetInnerHTML={{ __html: highlightJSON(result.structuredResume) }}
              />
            </div>
          )}

          {/* Similarity Check Tab Content */}
          {activeReportTab === 'similarity' && (
            <div className="card fade-in text-left">
              <h3 className="card-title">Similarity Compatibility Verification</h3>
              <div className="card-divider"></div>
              <p className="text-secondary" style={{ fontSize: '13px', marginBottom: '12px' }}>
                Detailed scoring factors computed by the programmatic evaluation algorithm.
              </p>
              
              <div className="grid grid-cols-3 gap-6" style={{ fontSize: '13px' }}>
                {/* Rule Violation Penalty Card */}
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: 'var(--shadow)'
                }}>
                  <div className="flex align-center justify-between">
                    <h4 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Rule Penalty</h4>
                    <span className="tag" style={{
                      backgroundColor: (result.ruleViolations?.length || 0) > 0 ? 'var(--danger-subtle)' : 'var(--success-subtle)',
                      color: (result.ruleViolations?.length || 0) > 0 ? 'var(--danger)' : 'var(--success)',
                      fontWeight: '700'
                    }}>
                      {(result.ruleViolations?.length || 0) > 0 ? `-${result.ruleViolations.length * 5}%` : '0%'}
                    </span>
                  </div>
                  <div className="card-divider" style={{ margin: '4px 0' }}></div>
                  <div className="flex-col gap-1">
                    <p className="text-secondary" style={{ fontSize: '12.5px' }}>
                      Violations Triggered: <strong style={{ color: (result.ruleViolations?.length || 0) > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{result.ruleViolations?.length || 0}</strong>
                    </p>
                    <div className="flex-col gap-1.5" style={{ marginTop: '6px' }}>
                      {result.ruleViolations?.length > 0 ? (
                        result.ruleViolations.map((rule, idx) => (
                          <div key={idx} style={{
                            fontSize: '11px',
                            color: 'var(--danger)',
                            backgroundColor: 'var(--danger-subtle)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ fontSize: '12px' }}>⚠️</span>
                            <span>{rule}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{
                          fontSize: '11.5px',
                          color: 'var(--success)',
                          backgroundColor: 'var(--success-subtle)',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(16, 185, 129, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: '500'
                        }}>
                          <span>✓ All rules passed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Skills Match Weighting Card */}
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: 'var(--shadow)'
                }}>
                  <div className="flex align-center justify-between">
                    <h4 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Skills Match</h4>
                    <span className="tag" style={{
                      backgroundColor: 'rgba(20, 184, 166, 0.08)',
                      color: 'var(--primary)',
                      fontWeight: '700'
                    }}>
                      {keywordScore}%
                    </span>
                  </div>
                  <div className="card-divider" style={{ margin: '4px 0' }}></div>
                  <div className="flex-col gap-2">
                    <p className="text-secondary" style={{ fontSize: '12.5px' }}>
                      Required Skills Count: <strong style={{ color: 'var(--text-primary)' }}>{result.skills?.matched?.length + result.skills?.missing?.length || 0}</strong>
                    </p>
                    <div className="progress-bar-container" style={{ marginTop: '8px' }}>
                      <div className="progress-bar-track" style={{ height: '6px', backgroundColor: 'var(--border)' }}>
                        <div className="progress-bar-fill" style={{ width: `${keywordScore}%`, backgroundColor: 'var(--primary)', height: '100%', borderRadius: '999px' }}></div>
                      </div>
                      <div className="flex justify-between" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '500' }}>
                        <span>Matched: {result.skills?.matched?.length || 0}</span>
                        <span>Missing: {result.skills?.missing?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Experience Alignment Factor Card */}
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: 'var(--shadow)'
                }}>
                  <div className="flex align-center justify-between">
                    <h4 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Experience Match</h4>
                    <span className="tag" style={{
                      backgroundColor: (result.experienceMatch?.detected || result.structuredResume?.experienceYears || 0) >= (result.experienceMatch?.required || 0) ? 'var(--success-subtle)' : 'var(--warning-subtle)',
                      color: (result.experienceMatch?.detected || result.structuredResume?.experienceYears || 0) >= (result.experienceMatch?.required || 0) ? 'var(--success)' : 'var(--warning)',
                      fontWeight: '700'
                    }}>
                      {(result.experienceMatch?.detected || result.structuredResume?.experienceYears || 0) >= (result.experienceMatch?.required || 0) ? 'Match' : 'Gap'}
                    </span>
                  </div>
                  <div className="card-divider" style={{ margin: '4px 0' }}></div>
                  <div className="flex-col gap-2">
                    <div className="flex justify-between" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      <span>Required Years:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{result.experienceMatch?.required || 0} yrs</strong>
                    </div>
                    <div className="flex justify-between" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      <span>Detected Years:</span>
                      <strong style={{ color: (result.experienceMatch?.detected || result.structuredResume?.experienceYears || 0) >= (result.experienceMatch?.required || 0) ? 'var(--success)' : 'var(--warning)' }}>
                        {result.experienceMatch?.detected || result.structuredResume?.experienceYears || 0} yrs
                      </strong>
                    </div>
                    <div className="progress-bar-container" style={{ marginTop: '4px' }}>
                      <div className="progress-bar-track" style={{ height: '6px', backgroundColor: 'var(--border)' }}>
                        <div className="progress-bar-fill" style={{ 
                          width: `${Math.min(100, ((result.experienceMatch?.detected || result.structuredResume?.experienceYears || 0) / Math.max(1, result.experienceMatch?.required || 1)) * 100)}%`, 
                          backgroundColor: (result.experienceMatch?.detected || result.structuredResume?.experienceYears || 0) >= (result.experienceMatch?.required || 0) ? 'var(--success)' : 'var(--warning)', 
                          height: '100%', 
                          borderRadius: '999px' 
                        }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback empty state for Analysis Report if no analysis result is loaded */}
      {activeSection === 'analysis' && !result && (
        <div className="card flex-col align-center justify-center gap-4 text-center py-12 fade-in" style={{ minHeight: '400px', backgroundColor: 'rgba(15, 118, 110, 0.01)', width: '100%' }}>
          <div className="file-icon-wrapper flex align-center justify-center" style={{ backgroundColor: 'rgba(15, 118, 110, 0.05)', width: '64px', height: '64px', borderRadius: '50%', marginBottom: '8px' }}>
            <FileTextIcon size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="font-primary" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>No Analysis Report Loaded</h3>
          <p className="font-sans text-secondary" style={{ fontSize: '14px', maxWidth: '380px', margin: '0 auto', lineHeight: '1.5' }}>
            To view an analysis report, please upload and analyze a resume on the Configure screen, or select a past scan from the History page.
          </p>
          <button 
            onClick={() => setActiveSection('input')} 
            className="button-primary flex align-center gap-2"
            style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', marginTop: '12px', cursor: 'pointer', backgroundColor: 'var(--primary)', border: 'none', color: '#FFFFFF' }}
          >
            <ConfigureIcon size={14} /> Go to Configure
          </button>
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
          height: 220px;
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

        .feedback-paragraph {
          font-family: var(--font-secondary);
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        .feedback-list {
          list-style: none;
          font-family: var(--font-secondary);
          font-size: 13px;
          color: var(--text-secondary);
        }

        .experience-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow);
          border-color: var(--primary) !important;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary);
        }

        :global(.json-key) {
          color: var(--primary);
          font-weight: 600;
        }
        :global(.json-string) {
          color: #10B981;
        }
        :global(.json-number) {
          color: #F59E0B;
        }
        :global(.json-boolean) {
          color: #3B82F6;
        }
        :global(.json-null) {
          color: #EF4444;
        }
      `}</style>
    </div>
  );
}
