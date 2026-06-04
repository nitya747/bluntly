import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API if key is available
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;

if (apiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error('Failed to initialize GoogleGenerativeAI:', error);
  }
}

/**
 * Main analysis function that analyzes resume text against a job description.
 * Utilizes Gemini if configured, otherwise falls back to a high-fidelity dynamic mock.
 * @param {string} resumeText - Full text extracted from resume
 * @param {string} jobDescription - Full text of the job description
 * @param {string} filename - Filename of the resume (for metadata / fallback)
 * @returns {Promise<object>} Parsed analysis result
 */
export async function analyzeResume(resumeText, jobDescription = '', filename = 'Resume') {
  const isMock = !genAI;

  if (isMock) {
    // Return high-fidelity mock data
    return generateMockAnalysis(resumeText, jobDescription, filename);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
You are an expert ATS (Applicant Tracking System) optimizer and professional recruiter.
Analyze the following resume text and compare it with the provided job description (if any).

RESUME TEXT:
"""
${resumeText}
"""

JOB DESCRIPTION:
Keep in mind: if the job description is empty, evaluate the resume overall for quality, layout, formatting, and professionalism, and set atsScore to null.
"""
${jobDescription}
"""

You must respond with a JSON object matching this exact schema:
{
  "candidateName": "Name extracted from resume (default to '${filename.split('.')[0]}' if not found)",
  "atsScore": 85, // Integer 0-100 or null if job description is empty
  "qualityScore": 78, // Integer 0-100 representing layout, formatting, structure, impact, etc.
  "skills": {
    "matched": ["list", "of", "skills", "found", "in", "both"],
    "missing": ["list", "of", "required", "skills", "in", "job", "description", "but", "missing", "in", "resume"],
    "detected": ["list", "of", "other", "professional", "skills", "found", "in", "resume", "not", "necessarily", "requested", "by", "job"]
  },
  "sections": {
    "experience": 85, // Integer 0-100
    "education": 90, // Integer 0-100
    "formatting": 80, // Integer 0-100
    "impact": 70 // Integer 0-100 representing action-verb usage, quantitative results, etc.
  },
  "feedback": {
    "summary": "A high-level paragraph summarizing the candidate's fit, experience level, and core strengths.",
    "strengths": ["Strengths 1", "Strengths 2", "Strengths 3"], // list of 3-4 bullet points
    "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"], // list of 3-4 actionable feedback bullets
    "detailedMarkdown": "A deeper markdown-formatted breakdown of the analysis, including formatting suggestions, experience reviews, and educational alignment."
  }
}
`;

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    return JSON.parse(textResponse);
  } catch (error) {
    console.error('Gemini API error, falling back to mock:', error);
    return generateMockAnalysis(resumeText, jobDescription, filename, true);
  }
}

/**
 * Dynamic mock analyzer that generates realistic, context-aware analysis.
 * Parses the resume and job description to extract names and compare skills.
 */
function generateMockAnalysis(resumeText, jobDescription = '', filename = 'Resume', isErrorFallback = false) {
  // Try to guess Candidate Name
  let candidateName = filename.split('.')[0].replace(/[-_]/g, ' ');
  // Clean up common naming patterns in resumes (e.g. "Resume_John_Doe")
  candidateName = candidateName.replace(/resume/gi, '').trim();
  if (!candidateName) candidateName = 'John Doe';
  
  // Extract candidate name from first few lines of resume text if possible
  const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0 && lines[0].length < 30 && !lines[0].toLowerCase().includes('resume')) {
    candidateName = lines[0];
  }

  // Predefined list of skills to search for
  const skillList = [
    'react', 'next.js', 'nextjs', 'vue', 'angular', 'javascript', 'typescript', 'node.js', 'nodejs',
    'python', 'java', 'c++', 'go', 'rust', 'ruby', 'php', 'sql', 'nosql', 'mongodb', 'postgresql',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'ci/cd', 'agile', 'scrum', 'html', 'css',
    'tailwind', 'ui/ux', 'figma', 'graphql', 'rest api', 'machine learning', 'data science',
    'testing', 'jest', 'playwright', 'cypress', 'terraform'
  ];

  const resumeLower = resumeText.toLowerCase();
  const jdLower = jobDescription.toLowerCase();

  // Helper to safely escape special regex chars and match boundaries (lookbehind/lookahead)
  const getSkillRegex = (skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'i');
  };

  // Find detected skills in resume
  const detected = [];
  skillList.forEach(skill => {
    const regex = getSkillRegex(skill);
    if (regex.test(resumeLower)) {
      detected.push(skill.toUpperCase());
    }
  });

  // Find required skills in job description
  const required = [];
  skillList.forEach(skill => {
    const regex = getSkillRegex(skill);
    if (regex.test(jdLower)) {
      required.push(skill.toUpperCase());
    }
  });

  // Split into matched and missing
  const matched = [];
  const missing = [];

  required.forEach(skill => {
    if (detected.includes(skill)) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  });

  // Remove matched from detected to avoid double listing
  const extraDetected = detected.filter(skill => !matched.includes(skill));

  // If no job description is provided
  const hasJd = jobDescription.trim().length > 0;
  
  // Calculate scores
  let atsScore = null;
  if (hasJd) {
    if (required.length === 0) {
      atsScore = 75; // Default baseline if we can't extract jd skills
    } else {
      const matchRatio = matched.length / required.length;
      atsScore = Math.round(55 + matchRatio * 40); // 55 to 95
      // cap between 0 and 100
      atsScore = Math.max(10, Math.min(100, atsScore));
    }
  }

  // Calculate section scores
  const experienceScore = Math.round(65 + Math.random() * 30);
  const educationScore = Math.round(70 + Math.random() * 25);
  const formattingScore = Math.round(60 + Math.random() * 35);
  // Impact is higher if they have numbers in resume (quantitative details)
  const hasNumbers = /\b\d{1,3}%\b|\$\b\d+|\b\d+\s+(?:million|users|employees|percent)\b/i.test(resumeLower);
  const impactScore = hasNumbers ? Math.round(75 + Math.random() * 20) : Math.round(50 + Math.random() * 25);

  const qualityScore = Math.round((experienceScore + educationScore + formattingScore + impactScore) / 4);

  // Generate lists of strengths and improvements based on scores
  const strengths = [];
  const improvements = [];

  if (experienceScore > 80) {
    strengths.push("Strong progression of professional experience with clear career trajectory.");
  } else {
    improvements.push("Elaborate on daily responsibilities and ownership scope in previous roles.");
  }

  if (educationScore > 80) {
    strengths.push("Excellent alignment of educational qualifications with standard industry benchmarks.");
  } else {
    improvements.push("Clearly highlight degree program, graduation dates, and relevant academic projects.");
  }

  if (impactScore > 80) {
    strengths.push("High usage of quantitative achievements and key impact metrics (e.g. percentages, dollars, scale).");
  } else {
    improvements.push("Quantify achievements by focusing on results (e.g., 'reduced load time by 20%') instead of list-of-tasks.");
  }

  if (formattingScore > 80) {
    strengths.push("Clean, parse-friendly resume layout with logical section headers.");
  } else {
    improvements.push("Ensure consistent date formatting, font spacing, and layout margins to enhance parsing readability.");
  }

  // Add general fallback bullets if needed
  if (strengths.length < 3) {
    strengths.push("Professional summary contains clear value proposition.");
    strengths.push("Good representation of core technical skills in an easily-scannable format.");
  }
  if (improvements.length < 3) {
    improvements.push("Use strong action verbs (e.g., 'Led', 'Optimized', 'Developed') to start all bullet points.");
    improvements.push("Integrate more keywords from the job description directly into your experience bullet points.");
  }

  // Build summary text
  let summary = '';
  if (isErrorFallback) {
    summary = `[Fallback Mode] Successfully processed ${filename}. `;
  }
  if (hasJd) {
    summary += `${candidateName}'s resume demonstrates a ${atsScore >= 80 ? 'strong' : atsScore >= 65 ? 'moderate' : 'limited'} match for the target role. There is solid alignment in keywords like ${matched.slice(0, 3).join(', ') || 'basic technologies'}. However, integrating missing core requirements like ${missing.slice(0, 3).join(', ') || 'additional tools'} would significantly improve matching performance.`;
  } else {
    summary += `${candidateName}'s resume is well-structured overall. The layout displays a strong focus on ${detected.slice(0, 3).join(', ') || 'core skillsets'}. Review the sections below for a breakdown of formatting and impact improvements.`;
  }

  // Build detailed markdown
  const detailedMarkdown = `
### Resume Evaluation Report for **${candidateName}**
*Mode: ${isErrorFallback ? '⚠️ Error Fallback' : genAI ? '🤖 Gemini AI' : '🎭 Dynamic Mock Simulation'}*

#### 1. ATS Matching Analysis
${hasJd ? `The candidate matches **${matched.length}** out of **${required.length}** extracted job requirements. To boost the ATS score, consider customizing the resume descriptions to explicitly reference the missing keywords: ${missing.length > 0 ? missing.map(s => `\`${s}\``).join(', ') : 'None'}.` : 'No job description was provided to calculate an ATS matching score. Please supply a job description in the side panel for compatibility analysis.'}

#### 2. Structural & Layout Review
* **Experience & Projects**: The experience section scores **${experienceScore}%**. The entries are generally well-detailed. Make sure descriptions focus on *accomplishments* rather than *responsibilities*.
* **Education**: The education section scores **${educationScore}%**. Credentials, institution names, and graduation timelines are clearly represented.
* **Formatting**: Scoring **${formattingScore}%**. The document shows a logical flow. Ensure there are no complex multi-column grids or graphics that might confuse standard parser layouts.
* **Impact & Metrics**: Scoring **${impactScore}%**. ${hasNumbers ? 'Good job including quantitative values!' : 'Warning: Resume contains very few metrics or numbers. Bullet points should show the *result* of your work to make a stronger impression.'}

---
*Created by blunlty*
`;

  return {
    candidateName,
    atsScore,
    qualityScore,
    skills: {
      matched: matched.slice(0, 10),
      missing: missing.slice(0, 10),
      detected: extraDetected.slice(0, 15)
    },
    sections: {
      experience: experienceScore,
      education: educationScore,
      formatting: formattingScore,
      impact: impactScore
    },
    feedback: {
      summary,
      strengths: strengths.slice(0, 4),
      improvements: improvements.slice(0, 4),
      detailedMarkdown
    }
  };
}
