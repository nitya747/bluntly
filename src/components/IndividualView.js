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
  SettingsIcon 
} from './Icons';

export default function IndividualView({ onAddHistory, selectedAnalysis, credits, setCredits }) {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [dragOver, setDragOver] = useState(false);
  const [activeSection, setActiveSection] = useState('input'); // 'input' or 'analysis'

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

  // Sample job description for easy testing
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
    setActiveSection('analysis');

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
        timestamp: data.analysis.timestamp,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper to get formatted score color
  const getScoreColorClass = (score) => {
    if (score >= 80) return 'good';
    if (score >= 65) return 'average';
    return 'poor';
  };

  // SVG Gauge parameters
  const R = 40;
  const C = 2 * Math.PI * R; // ~251.32

  return (
    <div className="workspace flex-col gap-6">
      {/* Sub-navigation tabs for Setup vs Analysis */}
      {result && (
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

      {/* Input / Configure Section */}
      {activeSection === 'input' && (
        <div className="flex-col gap-6">
          <div className="input-section grid grid-cols-2 gap-8">
            {/* Dropzone Container */}
            <div 
              className={`dropzone card flex-col align-center justify-center gap-3 ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="file-details flex-col align-center gap-3 w-full">
                  <div className="file-icon-wrapper flex align-center justify-center">
                    <span className="file-icon-emoji flex align-center justify-center" style={{ color: '#FFFFFF' }}>
                      {file.name.endsWith('.tex') ? <FileCodeIcon size={28} /> : <FileTextIcon size={28} />}
                    </span>
                  </div>
                  <div className="file-info flex-col align-center">
                    <span className="file-name font-sans">{file.name}</span>
                    <span className="file-size font-mono">{Math.round(file.size / 1024)} KB</span>
                    <span className="file-badge font-mono">{file.name.split('.').pop().toUpperCase()}</span>
                  </div>
                  <button onClick={clearFile} className="button-secondary btn-sm flex align-center gap-1.5" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <XIcon size={14} /> Clear File
                  </button>
                </div>
              ) : (
                <label className="upload-label flex-col align-center justify-center gap-3 cursor-pointer">
                  <input type="file" onChange={handleFileChange} accept=".pdf,.tex,.txt" className="hidden-input" />
                  <div className="upload-icon-circle flex align-center justify-center">
                    <UploadIcon size={24} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="upload-text flex-col align-center text-center">
                    <span className="upload-title font-sans">Drag & Drop Resume</span>
                    <span className="upload-subtitle font-sans">or click to browse local files</span>
                    <span className="upload-formats font-mono">Supports PDF or LaTeX (.tex)</span>
                  </div>
                </label>
              )}
            </div>

            {/* Job Description Card */}
            <div className="jd-box card flex-col gap-3">
              <div className="flex justify-between align-center">
                <label className="label-title font-sans">Target Job Description</label>
                <button onClick={loadSampleJD} className="button-secondary btn-xs font-sans flex align-center gap-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <SparklesIcon size={12} /> Load Sample JD
                </button>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste target job requirements here to calculate ATS compatibility score..."
                className="jd-textarea font-sans"
              />
              <div className="jd-footer flex justify-between font-mono">
                <span>{jobDescription.split(/\s+/).filter(Boolean).length} words</span>
                <span>{jobDescription.length} characters</span>
              </div>
            </div>
          </div>

          {/* Credit Check Banner */}
          {credits === 0 && (
            <div className="credit-warning-banner card flex align-center gap-3">
              <span className="error-icon flex align-center">⚠️</span>
              <span className="error-message font-sans">
                Out of credits. Please click <strong>+ Top Up</strong> in the sidebar to add credits.
              </span>
            </div>
          )}

          {/* Action Button - Moved a bit down via styles */}
          <div className="action-row flex flex-col align-center justify-center gap-2">
            <button
              onClick={runAnalysis}
              disabled={!file || analyzing || credits === 0}
              className="button-primary run-btn font-sans"
            >
              {analyzing ? (
                <span className="flex align-center justify-center gap-2" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <SettingsIcon size={18} className="spin-animation" /> Running Parsing & AI Analysis...
                </span>
              ) : (
                <span className="flex align-center justify-center gap-2" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <SearchIcon size={18} /> Analyse Compatibility Score
                </span>
              )}
            </button>
            <span className="credit-cost-subtext font-sans">Costs 1 credit (You have {credits} credits)</span>
          </div>

          {/* Error Bound (if in input view) */}
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
          {/* Skeletons Loading State */}
          {analyzing && (
            <div className="skeleton-loading card flex-col gap-6">
              <div className="skeleton-row flex gap-6">
                <div className="skeleton-circle"></div>
                <div className="skeleton-circle"></div>
                <div className="skeleton-lines flex-1 flex-col gap-3">
                  <div className="skeleton-line w-full"></div>
                  <div className="skeleton-line w-3-4"></div>
                  <div className="skeleton-line w-1-2"></div>
                </div>
              </div>
              <div className="skeleton-line w-full"></div>
              <div className="skeleton-line w-5-6"></div>
            </div>
          )}

          {/* Error Bound (if analysis failed) */}
          {error && !analyzing && (
            <div className="error-card card flex align-center gap-3">
              <span className="error-icon flex align-center"><AlertIcon size={20} /></span>
              <span className="error-message font-sans">{error}</span>
            </div>
          )}

          {/* Results Dashboard Panel */}
          {!analyzing && result && (
            <div className="results-panel grid grid-cols-2 gap-8">
              {/* Left Column: Gauges and Breakdown */}
              <div className="flex-col gap-8">
                {/* Gauges Card */}
                <div className="card flex-col gap-4">
                  <h3 className="card-title font-sans">Compatibility Scores</h3>
                  <div className="gauges-container flex justify-around align-center py-4">
                    {/* ATS Score Gauge (only shown if job description was supplied) */}
                    {result.atsScore !== null && result.atsScore !== undefined && (
                      <div className="gauge-item flex-col align-center gap-2">
                        <div className="gauge-svg-wrapper">
                          <svg width="100" height="100" viewBox="0 0 100 100" className="gauge-svg">
                            <circle cx="50" cy="50" r={R} stroke="var(--border-color)" strokeWidth="8" fill="transparent" />
                            <circle
                              cx="50"
                              cy="50"
                              r={R}
                              stroke="var(--primary)"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={C}
                              strokeDashoffset={C - (result.atsScore / 100) * C}
                              strokeLinecap="round"
                              className="gauge-circle-fill"
                            />
                          </svg>
                          <span className={`gauge-value font-mono ${getScoreColorClass(result.atsScore)}`}>
                            {result.atsScore}%
                          </span>
                        </div>
                        <span className="gauge-label font-sans">ATS Match Score</span>
                      </div>
                    )}

                    {/* Quality Score Gauge */}
                    <div className="gauge-item flex-col align-center gap-2">
                      <div className="gauge-svg-wrapper">
                        <svg width="100" height="100" viewBox="0 0 100 100" className="gauge-svg">
                          <circle cx="50" cy="50" r={R} stroke="var(--border-color)" strokeWidth="8" fill="transparent" />
                          <circle
                            cx="50"
                            cy="50"
                            r={R}
                            stroke="var(--secondary)"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={C}
                            strokeDashoffset={C - (result.qualityScore / 100) * C}
                            strokeLinecap="round"
                            className="gauge-circle-fill"
                          />
                        </svg>
                        <span className={`gauge-value font-mono ${getScoreColorClass(result.qualityScore)}`}>
                          {result.qualityScore}%
                        </span>
                      </div>
                      <span className="gauge-label font-sans">Resume Quality</span>
                    </div>
                  </div>
                </div>

                {/* Breakdown Score Bars */}
                <div className="card flex-col gap-4">
                  <h3 className="card-title font-sans">Section Details</h3>
                  <div className="breakdown-list flex-col gap-3">
                    {Object.entries(result.sections).map(([key, score]) => (
                      <div key={key} className="breakdown-item flex-col gap-1">
                        <div className="flex justify-between font-sans">
                          <span className="breakdown-name font-sans">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                          <span className="breakdown-score font-mono">{score}%</span>
                        </div>
                        <div className="breakdown-track">
                          <div 
                            className={`breakdown-fill ${key}`} 
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Feedback Tabs and Skills Chips */}
              <div className="flex-col gap-8">
                {/* Skills Dashboard */}
                <div className="card flex-col gap-3">
                  <h3 className="card-title font-sans">Keywords & Skills Analysis</h3>
                  
                  {/* Matched Skills */}
                  <div className="skills-sub-group flex-col gap-2">
                    <span className="group-label font-sans flex align-center gap-2" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <CheckIcon size={14} style={{ color: 'var(--success)' }} /> Matched Skills ({result.skills.matched.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {result.skills.matched.length === 0 ? (
                        <span className="no-skills font-sans">None matching.</span>
                      ) : (
                        result.skills.matched.map((s, idx) => (
                          <span key={idx} className="chip chip-success font-mono">{s}</span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  {result.skills.missing && result.skills.missing.length > 0 && (
                    <div className="skills-sub-group flex-col gap-2 mt-2">
                      <span className="group-label font-sans flex align-center gap-2" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <XIcon size={14} style={{ color: 'var(--danger)' }} /> Missing Keywords ({result.skills.missing.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {result.skills.missing.map((s, idx) => (
                          <span key={idx} className="chip chip-danger font-mono">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detected Skills */}
                  <div className="skills-sub-group flex-col gap-2 mt-2">
                    <span className="group-label font-sans flex align-center gap-2" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <SearchIcon size={14} style={{ color: 'var(--primary)' }} /> Other Detected Skills ({result.skills.detected.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {result.skills.detected.length === 0 ? (
                        <span className="no-skills font-sans">None detected.</span>
                      ) : (
                        result.skills.detected.map((s, idx) => (
                          <span key={idx} className="chip chip-primary font-mono">{s}</span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Feedback Tab Selector */}
                <div className="card flex-col gap-4">
                  <div className="tabs-header flex gap-2 border-b">
                    {['summary', 'strengths', 'improvements', 'details'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`tab-btn font-sans ${activeTab === tab ? 'active' : ''}`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className="tabs-content">
                    {activeTab === 'summary' && (
                      <p className="summary-paragraph font-sans">{result.feedback.summary}</p>
                    )}

                    {activeTab === 'strengths' && (
                      <ul className="checklist flex-col gap-2">
                        {result.feedback.strengths.map((str, idx) => (
                          <li key={idx} className="checklist-item flex gap-2 font-sans align-center">
                            <span className="check-icon flex" style={{ color: 'var(--success)' }}><CheckIcon size={14} /></span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {activeTab === 'improvements' && (
                      <ul className="checklist flex-col gap-2">
                        {result.feedback.improvements.map((imp, idx) => (
                          <li key={idx} className="checklist-item flex gap-2 font-sans align-center">
                            <span className="check-icon flex" style={{ color: 'var(--warning)' }}><SparklesIcon size={14} /></span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {activeTab === 'details' && (
                      <div className="detailed-markdown font-sans">
                        <pre className="markdown-pre font-sans">{result.feedback.detailedMarkdown}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .workspace {
          padding: 2rem;
          overflow-y: auto;
          flex: 1;
        }

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

        .action-row {
          margin-top: 2rem;
          margin-bottom: 1.5rem;
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

        .file-icon-wrapper {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          width: 60px;
          height: 60px;
          border-radius: 12px;
        }

        .file-icon-emoji {
          font-size: 2rem;
        }

        .file-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        .file-badge {
          background-color: var(--primary-light);
          color: var(--primary);
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          margin-top: 0.4rem;
          border: 1px solid var(--border-glow);
        }

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
          border-radius: 16px;
          border: 1px solid var(--danger);
        }

        .error-icon {
          font-size: 1.3rem;
        }

        .error-message {
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* Skeleton States */
        .skeleton-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background-color: var(--border-color);
          animation: pulse-skeleton 1.5s infinite ease-in-out;
        }

        .skeleton-line {
          height: 16px;
          border-radius: 4px;
          background-color: var(--border-color);
          animation: pulse-skeleton 1.5s infinite ease-in-out;
        }

        .w-full { width: 100%; }
        .w-3-4 { width: 75%; }
        .w-5-6 { width: 83%; }
        .w-1-2 { width: 50%; }

        @keyframes pulse-skeleton {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }

        /* Results Display */
        .card-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }

        .gauge-svg-wrapper {
          position: relative;
          width: 100px;
          height: 100px;
        }

        .gauge-svg {
          transform: rotate(-90deg);
        }

        .gauge-circle-fill {
          transition: stroke-dashoffset 0.8s ease-out;
        }

        .gauge-value {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.15rem;
          font-weight: 800;
        }

        .gauge-value.good { color: var(--success); }
        .gauge-value.average { color: var(--warning); }
        .gauge-value.poor { color: var(--danger); }

        .gauge-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .breakdown-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .breakdown-score {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .breakdown-track {
          background-color: var(--bg-primary);
          height: 8px;
          border-radius: 9999px;
          overflow: hidden;
          width: 100%;
        }

        .breakdown-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.8s ease-out;
        }

        .breakdown-fill.experience { background-color: var(--primary); }
        .breakdown-fill.education { background-color: var(--secondary); }
        .breakdown-fill.formatting { background-color: var(--success); }
        .breakdown-fill.impact { background-color: var(--warning); }

        .group-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .no-skills {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .tabs-header {
          border-bottom: 1px solid var(--border-color);
          display: flex;
        }

        .tab-btn {
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.5rem 0.75rem;
          transition: all 0.2s;
        }

        .tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .tabs-content {
          min-height: 140px;
          padding-top: 0.5rem;
        }

        .summary-paragraph {
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--text-secondary);
        }

        .checklist {
          list-style: none;
        }

        .checklist-item {
          font-size: 0.85rem;
          line-height: 1.4;
          color: var(--text-secondary);
        }

        .check-emoji {
          flex-shrink: 0;
        }

        .detailed-markdown {
          max-height: 250px;
          overflow-y: auto;
          background-color: var(--bg-primary);
          border-radius: 8px;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
        }

        .markdown-pre {
          white-space: pre-wrap;
          font-size: 0.8rem;
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

        .credit-warning-banner {
          border-color: var(--warning);
          background-color: var(--warning-bg);
          color: var(--warning);
          padding: 0.75rem 1rem;
          border-radius: 12px;
          margin-top: 1rem;
          max-width: 450px;
          align-self: center;
        }

        .credit-cost-subtext {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
