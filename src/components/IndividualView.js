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
  ConfigureIcon,
  ChevronDownIcon,
  ChevronUpIcon
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
  onClearAnalysis,
  credits, 
  setCredits, 
  history = [],
  activeSection,
  setActiveSection,
  setActiveView
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
  const [detailedExpanded, setDetailedExpanded] = useState(false);
  const [copiedTipIndex, setCopiedTipIndex] = useState(null);

  const handleCopyJSON = () => {
    if (result && result.structuredResume) {
      navigator.clipboard.writeText(JSON.stringify(result.structuredResume, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyTip = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedTipIndex(index);
    setTimeout(() => setCopiedTipIndex(null), 2000);
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
    if (extension !== 'pdf' && extension !== 'tex' && extension !== 'txt' && extension !== 'png' && extension !== 'jpg' && extension !== 'jpeg' && extension !== 'webp') {
      setError('Unsupported file type. Please upload a PDF (.pdf), LaTeX (.tex), Text (.txt), or Image (.png, .jpg, .jpeg, .webp) file.');
      setFile(null);
      setResult(null);
      return;
    }
    setError(null);
    setFile(selectedFile);
    setResult(null);
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    setResult(null);
    if (onClearAnalysis) {
      onClearAnalysis();
    }
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

  const getFileExtension = () => {
    if (!file || !file.name) return 'pdf';
    return file.name.split('.').pop().toLowerCase();
  };

  const getIconConfig = () => {
    const ext = getFileExtension();
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      return { label: 'IMG', color: '#3B82F6' };
    } else if (ext === 'tex') {
      return { label: 'TEX', color: '#8B5CF6' };
    } else if (ext === 'txt') {
      return { label: 'TXT', color: '#6B7280' };
    }
    return { label: 'PDF', color: '#EF4444' };
  };

  const iconConfig = getIconConfig();

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

  const getPriorityFixes = () => {
    const fixes = [];
    
    // Add rule violations (high priority/impact)
    ruleViolations.forEach(violation => {
      const vLower = violation.toLowerCase();
      if (vLower.includes('email')) {
        fixes.push({
          title: "Add Contact Details (Email)",
          desc: "Your email address is missing or couldn't be parsed. Recruiters need a clear email to contact you.",
          impact: "Critical",
          impactColor: "var(--danger)",
          impactBg: "var(--danger-subtle)",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          )
        });
      } else if (vLower.includes('phone')) {
        fixes.push({
          title: "Add Contact Details (Phone)",
          desc: "A valid phone number is essential for recruiter outreach and interview scheduling.",
          impact: "Critical",
          impactColor: "var(--danger)",
          impactBg: "var(--danger-subtle)",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          )
        });
      } else if (vLower.includes('experience')) {
        fixes.push({
          title: "Create Experience Section",
          desc: "No work experience section was found. A standard timeline of roles is required for ATS matching.",
          impact: "Critical",
          impactColor: "var(--danger)",
          impactBg: "var(--danger-subtle)",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          )
        });
      } else if (vLower.includes('skills')) {
        fixes.push({
          title: "Create Technical Skills Section",
          desc: "A dedicated skills section is vital for ATS tools to quickly parse and register your expertise.",
          impact: "Critical",
          impactColor: "var(--danger)",
          impactBg: "var(--danger-subtle)",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          )
        });
      } else if (vLower.includes('short')) {
        fixes.push({
          title: "Increase Resume Content Depth",
          desc: "Your resume is brief. Elaborate further on project scopes and technical roles to provide context.",
          impact: "Medium",
          impactColor: "var(--warning)",
          impactBg: "var(--warning-subtle)",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          )
        });
      }
    });

    // Add LLM feedback improvements
    feedbackImprovements.forEach(imp => {
      let impact = "Medium";
      let impactColor = "var(--warning)";
      let impactBg = "var(--warning-subtle)";
      let icon = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
      
      const impLower = imp.toLowerCase();
      if (impLower.includes('quantify') || impLower.includes('metric') || impLower.includes('achievement') || impLower.includes('percent') || impLower.includes('number')) {
        impact = "High";
        impactColor = "var(--primary)";
        impactBg = "var(--primary-subtle)";
        icon = (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        );
      } else if (impLower.includes('tailor') || impLower.includes('keyword') || impLower.includes('match')) {
        impact = "High";
        impactColor = "var(--primary)";
        impactBg = "var(--primary-subtle)";
        icon = (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        );
      }
      
      const cleanTitle = imp.includes(':') ? imp.split(':')[0] : "Resume Improvement";
      const cleanDesc = imp.includes(':') ? imp.substring(imp.indexOf(':') + 1).trim() : imp;

      // Prevent duplicate descriptions or titles
      if (!fixes.some(f => f.desc.toLowerCase() === cleanDesc.toLowerCase() || f.title.toLowerCase() === cleanTitle.toLowerCase())) {
        fixes.push({
          title: cleanTitle,
          desc: cleanDesc,
          impact,
          impactColor,
          impactBg,
          icon
        });
      }
    });

    // Fallbacks if we don't have enough
    const fallbacks = [
      {
        title: "Quantify Achievements",
        desc: "Add metrics, percentages, and performance indicators to your experience descriptions.",
        impact: "High",
        impactColor: "var(--primary)",
        impactBg: "var(--primary-subtle)",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        )
      },
      {
        title: "Target Missing Skills",
        desc: "Explicitly list required keywords like React, Next.js, or TypeScript where appropriate.",
        impact: "High",
        impactColor: "var(--primary)",
        impactBg: "var(--primary-subtle)",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        )
      },
      {
        title: "Structure Formatting",
        desc: "Ensure simple, parser-friendly layout templates are used instead of dual columns.",
        impact: "Medium",
        impactColor: "var(--warning)",
        impactBg: "var(--warning-subtle)",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a6 6 0 0 1 8.49 8.49Z" />
            <path d="m9.05 6.22 4.24 4.24" />
            <path d="m11.88 9.05 1.41 1.41" />
            <path d="m6.22 9.05 4.24 4.24" />
            <path d="m14.71 11.88 1.41 1.41" />
            <path d="m17.54 14.71 1.41 1.41" />
          </svg>
        )
      }
    ];

    while (fixes.length < 3 && fallbacks.length > 0) {
      const fb = fallbacks.shift();
      if (!fixes.some(f => f.title.toLowerCase() === fb.title.toLowerCase())) {
        fixes.push(fb);
      }
    }

    return fixes.slice(0, 3);
  };

  const priorityFixes = getPriorityFixes();

  const strengthsList = [];
  const needsAttentionList = [];
  const atsRisksList = [];

  // Strengths
  feedbackStrengths.forEach(s => strengthsList.push(s));

  // ATS Risks (critical violations & matching risks)
  ruleViolations.forEach(v => {
    const vLower = v.toLowerCase();
    if (vLower.includes('email') || vLower.includes('phone') || vLower.includes('experience') || vLower.includes('skills')) {
      atsRisksList.push(v);
    } else {
      needsAttentionList.push(v);
    }
  });

  const displayAtsScore = result?.atsScore !== null && result?.atsScore !== undefined ? result.atsScore : 37;
  if (result?.atsScore !== null && displayAtsScore < 60) {
    atsRisksList.push(`Low overall job compatibility score (${displayAtsScore}%)`);
  }
  if (missingSkills.length > 6) {
    atsRisksList.push(`High volume of missing required keywords (${missingSkills.length} missing)`);
  }

  // Needs Attention
  feedbackImprovements.forEach(imp => {
    const impLower = imp.toLowerCase();
    if (impLower.includes('email') || impLower.includes('phone') || impLower.includes('experience') || impLower.includes('skills')) return;
    needsAttentionList.push(imp);
  });
  
  feedbackWordingImprovements.forEach(w => {
    needsAttentionList.push(`Wording tip: ${w}`);
  });

  const uniqueStrengths = Array.from(new Set(strengthsList)).slice(0, 4);
  const uniqueNeedsAttention = Array.from(new Set(needsAttentionList)).slice(0, 4);
  const uniqueAtsRisks = Array.from(new Set(atsRisksList)).slice(0, 4);



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
                style={{ backgroundColor: 'var(--primary-subtle)', border: '2px dashed var(--border)' }}
              >
                {file ? (
                  <div className="file-details flex-col align-center gap-3 w-full p-4">
                    <div className="file-icon-wrapper flex align-center justify-center" style={{ backgroundColor: 'var(--danger-subtle)', borderColor: 'var(--border)' }}>
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
                    <input type="file" onChange={handleFileChange} accept=".pdf,.tex,.txt,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} />
                    <div className="upload-icon-wrapper flex align-center justify-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <UploadIcon size={24} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="flex-col align-center text-center">
                      <span className="upload-title" style={{ fontSize: '15px', fontWeight: '700' }}>Drag and drop your file here</span>
                      <span className="upload-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>PDF, LaTeX, Text or Image. Max size 10MB</span>
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
            <div className="credit-warning-banner card flex align-center gap-3" style={{ alignSelf: 'center', maxWidth: '500px', width: '100%', borderColor: 'var(--danger)', backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)' }}>
              <span className="error-icon flex align-center"><AlertIcon size={16} /></span>
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
              <button onClick={() => setActiveView('history')} className="submenu-btn" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
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
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {individualScans.map((scan) => {
                      const atsScoreVal = scan.analysis?.atsScore;
                      const qualityScoreVal = scan.analysis?.qualityScore || 0;
                      return (
                        <tr key={scan.id}>
                          <td style={{ fontWeight: '700' }}>
                            <div className="flex align-center gap-2">
                              <FileTextIcon size={16} style={{ color: '#EF4444', marginRight: '4px' }} />
                              <span>{scan.filename}</span>
                            </div>
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
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => loadRecentScan(scan)}
                              className="button-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', fontWeight: '600' }}
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

      {/* 2. Analysis Report Screen Pattern */}
      {activeSection === 'analysis' && result && (
        <div className="flex-col gap-6 fade-in analysis-report-container">

          {/* Document Header block */}
          <div className="doc-header-block flex justify-between align-center w-full" style={{ border: 'none', backgroundColor: 'transparent' }}>
            <div className="flex align-center gap-4">
              <svg className="pdf-icon-svg" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 2H28L38 12V44C38 45.1 37.1 46 36 46H4C2.9 46 2 45.1 2 44V4C2 2.9 2.9 2 4 2Z" fill="var(--surface)" stroke={iconConfig.color} strokeWidth="2.5" strokeLinejoin="round"/>
                <path d="M28 2V12H38L28 2Z" fill="var(--surface)" stroke={iconConfig.color} strokeWidth="2.5" strokeLinejoin="round"/>
                <text x="20" y="32" fill={iconConfig.color} fontSize="11" fontWeight="900" fontFamily="var(--font-primary)" textAnchor="middle" letterSpacing="0.5">{iconConfig.label}</text>
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
          {activeReportTab === 'overview' && (() => {
            const scoreTierClass = displayAtsScore >= 75 ? 'match-high' : (displayAtsScore >= 50 ? 'match-mid' : 'match-low');
            const getFixTierClass = (impact) => {
              const imp = impact.toLowerCase();
              if (imp === 'critical') return 'fix-critical';
              if (imp === 'high') return 'fix-high';
              return 'fix-medium';
            };
            return (
              <div className="flex-col w-full fade-in" style={{ gap: '24px' }}>
                {/* Score Hero Section */}
                <div className="score-hero-card">
                  <div className="score-gauge-wrapper">
                    <svg className="score-gauge-svg" width="120" height="120" viewBox="0 0 120 120">
                      <circle className="score-gauge-bg" cx="60" cy="60" r="50" />
                      <circle 
                        className={`score-gauge-fill ${scoreTierClass}`}
                        cx="60" 
                        cy="60" 
                        r="50" 
                        strokeDasharray="314"
                        strokeDashoffset={314 - (displayAtsScore / 100) * 314}
                      />
                    </svg>
                    <div className="score-gauge-text">
                      <span className={`score-gauge-number ${scoreTierClass}`}>{displayAtsScore}</span>
                      <span className="score-gauge-label">Match</span>
                    </div>
                  </div>
                  
                  <div className="score-hero-info">
                    <div className="score-hero-meta">
                      <h3 className="score-hero-title">Resume Match Score</h3>
                      <span className="percentile-badge">Top {displayRankPercent}%</span>
                    </div>
                    <p className="assessment-text">
                      {feedbackSummary.split(/[.!?]/)[0] + '.'}
                    </p>
                    <button 
                      onClick={() => {
                        document.getElementById('priority-fixes')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="button-primary"
                      style={{ width: 'fit-content', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>Improve Resume</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Priority Fixes & Keyword Gaps Card */}
                <div id="priority-fixes" className="card text-left" style={{ padding: '20px' }}>
                  <div className="flex-col gap-1">
                    <h3 className="font-primary card-title" style={{ fontSize: '15.5px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Priority Fixes</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Top improvements ranked by estimated impact to optimize your match rate</span>
                  </div>
                  
                  <div className="priority-fixes-container" style={{ margin: '8px 0 0 0' }}>
                    {priorityFixes.map((fix, idx) => (
                      <div 
                        key={idx} 
                        className={`priority-fix-card ${getFixTierClass(fix.impact)}`}
                        onClick={() => {
                          const t = fix.title.toLowerCase();
                          if (t.includes('skills') || t.includes('keyword')) {
                            document.getElementById('keyword-gaps-section')?.scrollIntoView({ behavior: 'smooth' });
                          } else if (t.includes('contact') || t.includes('format') || t.includes('experience') || t.includes('education')) {
                            setDetailedExpanded(true);
                            setTimeout(() => {
                              document.getElementById('detailed-breakdown')?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="priority-fix-icon-box" style={{ color: fix.impactColor, backgroundColor: fix.impactBg }}>{fix.icon}</div>
                        <div className="priority-fix-content">
                          <span className="priority-fix-title">
                            {fix.title}
                            {(fix.impact === 'Critical' || fix.impact === 'High') && (
                              <span className={`pulsing-dot ${fix.impact.toLowerCase()}`} title={`${fix.impact} Action Required`} />
                            )}
                          </span>
                          <span className="priority-fix-desc">{fix.desc}</span>
                        </div>
                        <span 
                          className="priority-fix-impact" 
                          style={{ color: fix.impactColor, backgroundColor: fix.impactBg }}
                        >
                          {fix.impact}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="card-divider" style={{ margin: '4px 0 8px 0' }}></div>

                  {/* Missing Keywords Section */}
                  <div id="keyword-gaps-section" className="flex-col gap-3">
                    <div className="flex-col gap-1">
                      <h3 className="font-primary card-title" style={{ fontSize: '14.5px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Missing Keywords</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Add these missing target keywords to your resume to optimize your match rate</span>
                    </div>
                    
                    <div className="keyword-pills" style={{ marginTop: '8px' }}>
                      {missingSkills.slice(0, 15).map((skill, idx) => (
                        <span key={idx} className="keyword-pill missing">
                          <span style={{ fontWeight: '700', marginRight: '4px' }}>+</span>
                          <span>{skill}</span>
                        </span>
                      ))}
                      {missingSkills.length === 0 && (
                        <span className="text-secondary" style={{ fontSize: '13px' }}>No missing keywords. Great job!</span>
                      )}
                      {missingSkills.length > 15 && (
                        <span className="tag tag-neutral" style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px' }}>
                          +{missingSkills.length - 15} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible Detailed Breakdown Section */}
                <div id="detailed-breakdown" className="collapsible-container">
                  <button 
                    onClick={() => setDetailedExpanded(!detailedExpanded)}
                    className="collapsible-trigger"
                  >
                    <span className="collapsible-trigger-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: '4px' }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                      </svg>
                      <span>Detailed Breakdown Analysis</span>
                    </span>
                    <div className="flex align-center gap-2">
                      <span className="collapsible-trigger-subtitle">
                        {detailedExpanded ? "Hide detailed metrics" : "View experience, formatting, and section scores"}
                      </span>
                      <div className={`collapsible-chevron ${detailedExpanded ? 'open' : ''}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <ChevronDownIcon size={16} />
                      </div>
                    </div>
                  </button>
                  
                  {detailedExpanded && (
                    <div className="collapsible-content">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Left: Progress Bars */}
                        <div className="flex-col gap-4 text-left">
                          <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>Section Scores</h4>
                          <div className="flex-col gap-3">
                            {['experience', 'education', 'skills', 'formatting', 'impact'].map((key) => {
                              const score = result.sections?.[key] !== undefined && result.sections?.[key] !== null
                                ? result.sections[key]
                                : (key === 'experience' ? 30 : key === 'education' ? 90 : key === 'skills' ? 80 : key === 'formatting' ? 100 : 55);

                              let label = key.charAt(0).toUpperCase() + key.slice(1);
                              
                              return (
                                <div key={key} className="flex-col gap-1.5">
                                  <div className="flex justify-between align-center" style={{ fontSize: '12px' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{label}</span>
                                    <strong style={{ color: score >= 70 ? 'var(--success)' : 'var(--warning)' }}>{score} / 100</strong>
                                  </div>
                                  <div className="progress-bar-track" style={{ height: '6px' }}>
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
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Right: Metadata Details */}
                        <div className="flex-col gap-4 text-left" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
                          <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>Resume Parsing Metadata</h4>
                          <div className="grid grid-cols-2 gap-3" style={{ fontSize: '12px' }}>
                            <div className="flex-col gap-1" style={{ backgroundColor: 'var(--bg)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Experience</span>
                              <strong style={{ color: 'var(--text-primary)' }}>{result.structuredResume?.experienceYears || 0} years</strong>
                            </div>
                            <div className="flex-col gap-1" style={{ backgroundColor: 'var(--bg)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Education Records</span>
                              <strong style={{ color: 'var(--text-primary)' }}>{result.structuredResume?.education?.length || 0} found</strong>
                            </div>
                            <div className="flex-col gap-1" style={{ backgroundColor: 'var(--bg)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Email Address</span>
                              <span className="truncate" style={{ fontWeight: '700', color: 'var(--text-primary)' }} title={result.structuredResume?.email || 'N/A'}>
                                {result.structuredResume?.email || 'N/A'}
                              </span>
                            </div>
                            <div className="flex-col gap-1" style={{ backgroundColor: 'var(--bg)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Phone Number</span>
                              <span className="truncate" style={{ fontWeight: '700', color: 'var(--text-primary)' }} title={result.structuredResume?.phone || 'N/A'}>
                                {result.structuredResume?.phone || 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="flex-col gap-1.5" style={{ marginTop: '8px' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '500' }}>
                              Sections Identified:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {(result.structuredResume?.sectionsFound || []).map((sec, idx) => (
                                <span key={idx} className="tag tag-neutral" style={{ padding: '2px 8px', fontSize: '10px', textTransform: 'capitalize' }}>
                                  {sec}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
                    background: 'linear-gradient(135deg, var(--primary-subtle) 0%, var(--bg) 100%)',
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
                   background: 'linear-gradient(135deg, var(--primary-subtle) 0%, var(--bg) 100%)',
                  border: '1px solid var(--primary-subtle)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '8px', fontSize: '14px' }}>Strategic Alignment Summary</h4>
                  <p className="feedback-paragraph" style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6' }}>{feedbackSummary}</p>
                </div>

                {/* Diagnosis Grid (Strengths, Needs Attention, ATS Risks) */}
                <div className="diagnosis-grid" style={{ marginTop: '8px' }}>
                  {/* Strengths */}
                  <div className="diagnosis-col strengths">
                    <h4 className="diagnosis-col-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Strengths</span>
                    </h4>
                    <ul className="diagnosis-list">
                      {uniqueStrengths.length > 0 ? (
                        uniqueStrengths.map((str, idx) => (
                          <li key={idx} className="diagnosis-item">
                            <span className="diagnosis-item-icon" style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', marginTop: '2px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                            <span>{str}</span>
                          </li>
                        ))
                      ) : (
                        <li className="diagnosis-item" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No qualitative strengths identified.
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Needs Attention */}
                  <div className="diagnosis-col attention">
                    <h4 className="diagnosis-col-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span>Needs Attention</span>
                    </h4>
                    <ul className="diagnosis-list">
                      {uniqueNeedsAttention.length > 0 ? (
                        uniqueNeedsAttention.map((item, idx) => (
                          <li key={idx} className="diagnosis-item">
                            <span className="diagnosis-item-icon" style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', marginTop: '2px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                              </svg>
                            </span>
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="diagnosis-item" style={{ color: 'var(--success)', fontStyle: 'italic' }}>
                          ✓ All secondary items look solid!
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* ATS Risks */}
                  <div className="diagnosis-col risks">
                    <h4 className="diagnosis-col-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>ATS Risks</span>
                    </h4>
                    <ul className="diagnosis-list">
                      {uniqueAtsRisks.length > 0 ? (
                        uniqueAtsRisks.map((risk, idx) => (
                          <li key={idx} className="diagnosis-item">
                            <span className="diagnosis-item-icon" style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', marginTop: '2px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                            </span>
                            <span>{risk}</span>
                          </li>
                        ))
                      ) : (
                        <li className="diagnosis-item" style={{ color: 'var(--success)', fontStyle: 'italic', fontWeight: '600' }}>
                          ✓ No severe ATS risks detected!
                        </li>
                      )}
                    </ul>
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
                             border: '1px solid var(--danger-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span className="flex align-center" style={{ color: 'var(--danger)' }}><AlertIcon size={12} /></span>
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
                           border: '1px solid var(--success-subtle)',
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
                      backgroundColor: 'var(--primary-subtle)',
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
        <div className="card flex-col align-center justify-center gap-4 text-center py-12 fade-in" style={{ minHeight: '400px', backgroundColor: 'transparent', width: '100%' }}>
          <div className="file-icon-wrapper flex align-center justify-center" style={{ backgroundColor: 'var(--primary-subtle)', width: '64px', height: '64px', borderRadius: '50%', marginBottom: '8px' }}>
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
