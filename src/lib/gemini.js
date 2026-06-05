import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

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
 * Stage 1: Parse Resume Text to Structured JSON
 * Calls Gemini if configured, otherwise falls back to regex-based mock parser.
 */
export async function parseResumeToJSON(resumeText, filename = 'Resume') {
  if (!genAI) {
    return parseResumeToJSONMock(resumeText, filename);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
You are an expert resume parser. Extract structural information from the following resume text and format it into a valid JSON object matching the exact schema below.

RESUME TEXT:
"""
${resumeText}
"""

JSON SCHEMA:
{
  "name": "Candidate's full name (if not found, extract from filename/context or default to null)",
  "email": "Candidate's email address (e.g. john@example.com) or null if not found",
  "phone": "Candidate's phone number or null if not found",
  "skills": ["Array of technical/professional skills found in the resume"],
  "experienceYears": 3.5, // Total years of professional experience across all roles as a number (e.g. 3 or 4.5). Estimate based on dates.
  "education": [
    {
      "degree": "Degree name (e.g. B.S. Computer Science) or null",
      "institution": "School/University name or null",
      "year": "Graduation year (e.g. 2022) or null"
    }
  ],
  "experience": [
    {
      "company": "Company name or null",
      "role": "Job Title or null",
      "duration": "Duration string (e.g. June 2021 - Present) or null",
      "years": 2, // Duration of this specific role in years (number)
      "description": "Short description of role responsibilities and key achievements"
    }
  ],
  "sectionsFound": ["List of headings/sections identified in the resume (lowercase, e.g. 'experience', 'education', 'skills', 'projects', 'summary')"]
}
`;

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    const parsed = JSON.parse(textResponse);
    parsed.textLength = resumeText.length;
    return parsed;
  } catch (error) {
    console.error('Gemini Resume Parsing error, falling back to mock:', error);
    logGeminiError(error);
    return parseResumeToJSONMock(resumeText, filename);
  }
}

/**
 * Stage 1b: Parse Job Description text into structured requirements
 */
export async function parseJobDescriptionToJSON(jobDescription) {
  if (!jobDescription || !jobDescription.trim()) {
    return {
      requiredSkills: [],
      preferredSkills: [],
      requiredExperienceYears: 0,
      keywords: []
    };
  }

  if (!genAI) {
    return parseJobDescriptionToJSONMock(jobDescription);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
You are an expert job description parser. Parse the following job description and extract required skills, preferred skills, experience years, and key terms.

JOB DESCRIPTION:
"""
${jobDescription}
"""

JSON SCHEMA:
{
  "requiredSkills": ["List of required skills or technologies"],
  "preferredSkills": ["List of nice-to-have or preferred skills/technologies"],
  "requiredExperienceYears": 3.0, // Minimum years of experience requested as a number (default to 0 if not specified)
  "keywords": ["List of key professional terms, methodologies, or buzzwords important for this role"]
}
`;

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    return JSON.parse(textResponse);
  } catch (error) {
    console.error('Gemini JD Parsing error, falling back to mock:', error);
    logGeminiError(error);
    return parseJobDescriptionToJSONMock(jobDescription);
  }
}

/**
 * Stage 2: Rule Engine (Programmatic Evaluator)
 * Computes rule checks, quality scores, and section details programmatically in JavaScript.
 */
export function runRuleEngine(structuredResume) {
  const violations = [];
  const passed = [];

  // Check email
  if (!structuredResume.email || !structuredResume.email.trim()) {
    violations.push("Missing email");
  } else {
    passed.push("Email present");
  }

  // Check phone
  if (!structuredResume.phone || !structuredResume.phone.trim()) {
    violations.push("Missing phone");
  } else {
    passed.push("Phone present");
  }

  // Check length (Resume too short)
  if (structuredResume.textLength < 600) {
    violations.push("Resume too short");
  } else {
    passed.push("Resume length sufficient");
  }

  // Check experience section
  const expMatch = structuredResume.sectionsFound.some(
    s => s.toLowerCase().includes('experience') || s.toLowerCase().includes('work')
  ) && structuredResume.experience && structuredResume.experience.length > 0;
  
  if (!expMatch) {
    violations.push("No experience section");
  } else {
    passed.push("Experience section found");
  }

  // Check skills section
  const skillsMatch = structuredResume.sectionsFound.some(
    s => s.toLowerCase().includes('skills')
  ) && structuredResume.skills && structuredResume.skills.length > 0;

  if (!skillsMatch) {
    violations.push("No skills section");
  } else {
    passed.push("Skills section found");
  }

  // Calculate Quality Score (starts at 100, apply penalties)
  let qualityScore = 100;
  if (violations.includes("Missing email")) qualityScore -= 10;
  if (violations.includes("Missing phone")) qualityScore -= 10;
  if (violations.includes("Resume too short")) qualityScore -= 20;
  if (violations.includes("No experience section")) qualityScore -= 30;
  if (violations.includes("No skills section")) qualityScore -= 30;
  
  // Clamp between 10 and 100
  qualityScore = Math.max(10, Math.min(100, qualityScore));

  // Determine section-level scores
  const experienceScore = expMatch ? Math.min(100, Math.round(65 + Math.min(5, structuredResume.experienceYears) * 7)) : 0;
  const educationScore = (structuredResume.education && structuredResume.education.length > 0) ? 90 : 0;
  const formattingScore = Math.max(10, 100 - (violations.includes("Missing email") ? 15 : 0) - (violations.includes("Missing phone") ? 15 : 0));
  
  // Impact is higher if descriptions contain numbers/metrics
  let hasNumbers = false;
  if (structuredResume.experience && structuredResume.experience.length > 0) {
    const descText = structuredResume.experience.map(e => e.description || '').join(' ');
    hasNumbers = /\b\d{1,3}%\b|\$\b\d+|\b\d+\s+(?:million|users|employees|percent)\b/i.test(descText);
  }
  const impactScore = hasNumbers ? 85 : 55;

  return {
    qualityScore,
    ruleViolations: violations,
    passedRules: passed,
    sections: {
      experience: experienceScore,
      education: educationScore,
      formatting: formattingScore,
      impact: impactScore
    }
  };
}

/**
 * Stage 3: Comparison Engine (Programmatic JD Matcher)
 * Matches structured resume features against structured JD requirements.
 */
export function runComparisonEngine(structuredResume, structuredJD) {
  if (!structuredJD || !structuredJD.requiredSkills || structuredJD.requiredSkills.length === 0) {
    return {
      atsScore: null,
      skills: {
        matched: [],
        missing: [],
        detected: structuredResume.skills
      },
      experienceMatch: {
        required: 0,
        detected: structuredResume.experienceYears,
        matched: true
      }
    };
  }

  const matched = [];
  const missing = [];
  const detected = [];

  const resumeSkillsLower = structuredResume.skills.map(s => s.toLowerCase());

  // Check skills
  structuredJD.requiredSkills.forEach(reqSkill => {
    const reqSkillLower = reqSkill.toLowerCase();
    
    // Fuzzy check: if reqSkill is contained in any resume skill, or vice versa
    const isMatched = resumeSkillsLower.some(resSkill => 
      resSkill.includes(reqSkillLower) || reqSkillLower.includes(resSkill)
    );

    if (isMatched) {
      // Find original casing
      const orig = structuredResume.skills.find(s => s.toLowerCase().includes(reqSkillLower) || reqSkillLower.includes(s.toLowerCase())) || reqSkill;
      matched.push(orig);
    } else {
      missing.push(reqSkill);
    }
  });

  // Populate detected (skills present in resume but not requested in required skills)
  structuredResume.skills.forEach(resSkill => {
    const isMatched = matched.some(m => m.toLowerCase().includes(resSkill.toLowerCase()) || resSkill.toLowerCase().includes(m.toLowerCase()));
    if (!isMatched) {
      detected.push(resSkill);
    }
  });

  // Keyword match density
  let keywordMatchRatio = 1.0;
  if (structuredJD.keywords && structuredJD.keywords.length > 0) {
    const matchedKeywords = structuredJD.keywords.filter(kw => 
      resumeSkillsLower.some(s => s.includes(kw.toLowerCase()))
    );
    keywordMatchRatio = matchedKeywords.length / structuredJD.keywords.length;
  }

  // Experience Match
  const expMatched = structuredResume.experienceYears >= structuredJD.requiredExperienceYears;
  let expMatchScore = 100;
  if (structuredJD.requiredExperienceYears > 0) {
    expMatchScore = Math.min(100, Math.round((structuredResume.experienceYears / structuredJD.requiredExperienceYears) * 100));
  }

  // ATS Matching calculation
  const skillsMatchRatio = matched.length / structuredJD.requiredSkills.length;
  
  // Weighted ATS Score: 50% Skills, 30% Keyword Density, 20% Experience Match
  const rawAtsScore = (skillsMatchRatio * 50) + (keywordMatchRatio * 30) + (expMatchScore * 0.2);
  const atsScore = Math.max(10, Math.min(100, Math.round(rawAtsScore)));

  return {
    atsScore,
    skills: {
      matched: matched.slice(0, 10),
      missing: missing.slice(0, 10),
      detected: detected.slice(0, 15)
    },
    experienceMatch: {
      required: structuredJD.requiredExperienceYears,
      detected: structuredResume.experienceYears,
      matched: expMatched
    }
  };
}

/**
 * Stage 4: LLM Feedback Generator
 * Generates qualitative feedback, suggestions, advice based on parser & rule engines.
 */
export async function generateLLMFeedback(structuredResume, jobDescription, atsScore, qualityScore, ruleViolations) {
  if (!genAI) {
    return generateLLMFeedbackMock(structuredResume, jobDescription, atsScore, qualityScore, ruleViolations);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
You are an expert career advisor and technical recruiter.
Review the candidate's parsed resume details and target job description (if any), along with their programmatic scores.

CANDIDATE STRUCTURED RESUME DATA:
${JSON.stringify(structuredResume, null, 2)}

TARGET JOB DESCRIPTION:
${jobDescription || 'None provided'}

PROGRAMMATIC SCORES:
- ATS Match Score: ${atsScore !== null ? atsScore + '%' : 'N/A (No Job Description provided)'}
- Quality Score: ${qualityScore}%
- Rule Violations: ${JSON.stringify(ruleViolations)}

Based on this information, generate customized, detailed career feedback in a JSON object matching this schema:
{
  "summary": "A cohesive high-level paragraph summarizing the candidate's professional profile, experience level, and alignment with target roles or the job description.",
  "strengths": ["List of 3-4 bullet points highlighting key strengths visible in their experience, education, or skills."],
  "improvements": ["List of 3-4 actionable general improvements (e.g., adding certifications, formatting issues)."],
  "wordingImprovements": ["List of 3-4 specific suggestions on how to improve the wording or phrasing of the candidate's experience bullet points or summary (e.g. 'Change \"worked on React frontend\" to \"Engineered responsive frontend architectures using React...\"')."],
  "careerAdvice": "2-3 sentences of tailored career progression advice.",
  "detailedMarkdown": "A deeper markdown-formatted breakdown of the analysis, including section evaluations, educational alignment, and format polishing tips."
}
`;

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    return JSON.parse(textResponse);
  } catch (error) {
    console.error('Gemini Feedback Generation error, falling back to mock:', error);
    logGeminiError(error);
    return generateLLMFeedbackMock(structuredResume, jobDescription, atsScore, qualityScore, ruleViolations);
  }
}

/**
 * Orchestrator: Main analysis function that runs the parsing, rule engine, matching, and feedback.
 */
export async function analyzeResume(resumeText, jobDescription = '', filename = 'Resume') {
  // Step 1: Parser
  const structuredResume = await parseResumeToJSON(resumeText, filename);
  
  // Step 1b: JD Parser
  const structuredJD = await parseJobDescriptionToJSON(jobDescription);
  
  // Step 2: Rule Engine
  const rulesResult = runRuleEngine(structuredResume);
  
  // Step 3: Comparison Matching
  const matchResult = runComparisonEngine(structuredResume, structuredJD);

  // Step 4: Gemini Feedback
  const finalAtsScore = jobDescription.trim().length > 0 ? matchResult.atsScore : null;
  const feedback = await generateLLMFeedback(
    structuredResume, 
    jobDescription, 
    finalAtsScore, 
    rulesResult.qualityScore, 
    rulesResult.ruleViolations
  );

  return {
    candidateName: structuredResume.name || filename.split('.')[0].replace(/[-_]/g, ' ').replace(/resume/gi, '').trim() || 'John Doe',
    atsScore: finalAtsScore,
    qualityScore: rulesResult.qualityScore,
    ruleViolations: rulesResult.ruleViolations,
    passedRules: rulesResult.passedRules,
    skills: matchResult.skills,
    sections: rulesResult.sections,
    experienceMatch: matchResult.experienceMatch,
    feedback: feedback,
    structuredResume: structuredResume // Store structured JSON data
  };
}

/* ==========================================================================
   Fallback/Mock Implementation Helpers
   ========================================================================== */

function parseResumeToJSONMock(resumeText, filename) {
  const lines = resumeText.split('\n').map(l => l.trim()).filter(Boolean);
  
  let name = filename.split('.')[0].replace(/[-_]/g, ' ').replace(/resume/gi, '').trim();
  if (!name) name = 'John Doe';
  if (lines.length > 0 && lines[0].length < 30 && !lines[0].toLowerCase().includes('resume') && !lines[0].includes('@')) {
    name = lines[0];
  }

  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/i;
  const emailMatch = resumeText.match(emailRegex);
  const email = emailMatch ? emailMatch[0] : null;

  const phoneRegex = /(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/;
  const phoneMatch = resumeText.match(phoneRegex);
  const phone = phoneMatch ? phoneMatch[0] : null;

  const skillList = [
    'react', 'next.js', 'nextjs', 'vue', 'angular', 'javascript', 'typescript', 'node.js', 'nodejs',
    'python', 'java', 'c++', 'go', 'rust', 'ruby', 'php', 'sql', 'nosql', 'mongodb', 'postgresql',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'ci/cd', 'agile', 'scrum', 'html', 'css',
    'tailwind', 'ui/ux', 'figma', 'graphql', 'rest api', 'machine learning', 'data science',
    'testing', 'jest', 'playwright', 'cypress', 'terraform'
  ];

  const resumeLower = resumeText.toLowerCase();
  const skills = [];
  skillList.forEach(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'i');
    if (regex.test(resumeLower)) {
      skills.push(skill.toUpperCase());
    }
  });

  const sectionsFound = [];
  const sectionKeywords = {
    experience: ['experience', 'work', 'employment', 'history', 'professional'],
    education: ['education', 'university', 'college', 'academic'],
    skills: ['skills', 'technologies', 'tools', 'languages'],
    projects: ['projects', 'academic projects', 'personal projects']
  };

  Object.entries(sectionKeywords).forEach(([sec, kwList]) => {
    const found = kwList.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(resumeLower));
    if (found) {
      sectionsFound.push(sec);
    }
  });

  let experienceYears = 0;
  const yearMatches = resumeText.match(/\b(19|20)\d{2}\b/g);
  if (yearMatches && yearMatches.length >= 2) {
    const years = yearMatches.map(Number);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    experienceYears = Math.min(15, Math.max(1, maxYear - minYear));
  } else {
    experienceYears = 3;
  }

  const education = [];
  if (sectionsFound.includes('education')) {
    education.push({
      degree: "B.S. Computer Science",
      institution: "State University",
      year: "2022"
    });
  }

  const experience = [];
  if (sectionsFound.includes('experience')) {
    experience.push({
      company: "Tech Corp",
      role: "Frontend Developer",
      duration: "2022 - Present",
      years: experienceYears,
      description: "Led development of core features using React, Next.js, and TypeScript. Optimized load speeds by 20%."
    });
  }

  return {
    name,
    email,
    phone,
    skills,
    experienceYears,
    education,
    experience,
    sectionsFound,
    textLength: resumeText.length
  };
}

function parseJobDescriptionToJSONMock(jobDescription) {
  const skillList = [
    'react', 'next.js', 'nextjs', 'vue', 'angular', 'javascript', 'typescript', 'node.js', 'nodejs',
    'python', 'java', 'c++', 'go', 'rust', 'ruby', 'php', 'sql', 'nosql', 'mongodb', 'postgresql',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'ci/cd', 'agile', 'scrum', 'html', 'css',
    'tailwind', 'ui/ux', 'figma', 'graphql', 'rest api', 'machine learning', 'data science',
    'testing', 'jest', 'playwright', 'cypress', 'terraform'
  ];

  const jdLower = jobDescription.toLowerCase();
  const requiredSkills = [];
  skillList.forEach(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'i');
    if (regex.test(jdLower)) {
      requiredSkills.push(skill.toUpperCase());
    }
  });

  let requiredExperienceYears = 0;
  const expMatch = jobDescription.match(/(\d+)\+?\s*years?/i);
  if (expMatch) {
    requiredExperienceYears = Number(expMatch[1]);
  }

  const keywords = requiredSkills.slice(0, 5);
  if (jdLower.includes('agile')) keywords.push('AGILE');
  if (jdLower.includes('ci/cd') || jdLower.includes('cicd')) keywords.push('CI/CD');
  if (jdLower.includes('cloud')) keywords.push('CLOUD');

  return {
    requiredSkills,
    preferredSkills: [],
    requiredExperienceYears,
    keywords
  };
}

function generateLLMFeedbackMock(structuredResume, jobDescription, atsScore, qualityScore, ruleViolations) {
  const name = structuredResume.name || 'Candidate';
  const hasJd = jobDescription && jobDescription.trim().length > 0;
  
  const strengths = [];
  const improvements = [];
  const wordingImprovements = [
    "Refactor generic descriptions: Change 'helped build frontend' to 'Architected and implemented responsive frontend interfaces...'",
    "Add action-oriented verbs: Use words like 'Spearheaded', 'Engineered', and 'Optimized' at the beginning of each bullet point."
  ];

  if (structuredResume.experienceYears > 5) {
    strengths.push("Substantial professional experience (over 5 years) in software development.");
  } else if (structuredResume.experienceYears > 2) {
    strengths.push("Good foundation of industry experience with a clear career progression.");
  } else {
    strengths.push("Promising early career profile with core tech stack exposure.");
  }

  if (structuredResume.skills.length > 5) {
    strengths.push(`Strong technology portfolio with verified skills in ${structuredResume.skills.slice(0, 3).join(', ')}.`);
  }

  if (ruleViolations.includes("Missing email")) {
    improvements.push("Ensure your email address is clearly visible in the header of the resume.");
  }
  if (ruleViolations.includes("Missing phone")) {
    improvements.push("Provide a contact phone number so hiring managers can reach you easily.");
  }
  if (ruleViolations.includes("Resume too short")) {
    improvements.push("Elaborate further on your technical responsibilities and project details to ensure readability.");
  }
  if (ruleViolations.includes("No experience section")) {
    improvements.push("Add a dedicated Work Experience or Projects section detailing your professional output.");
  }
  if (ruleViolations.includes("No skills section")) {
    improvements.push("Create a clear, scannable Technical Skills section to help ATS systems parse your capabilities.");
  }

  if (strengths.length < 3) {
    strengths.push("Clear section separation and structural layout.");
  }
  if (improvements.length < 3) {
    improvements.push("Quantify achievements: include metrics, scale, or percentage improvements in role descriptions.");
    improvements.push("Tailor bullet points to explicitly match technologies requested in target job descriptions.");
  }

  let summary = '';
  let careerAdvice = '';

  if (hasJd) {
    summary = `${name}'s profile shows a ${atsScore >= 80 ? 'strong' : atsScore >= 65 ? 'moderate' : 'limited'} alignment with the job description. The profile has strong representation of skills like ${structuredResume.skills.slice(0, 3).join(', ') || 'core technologies'}.`;
    careerAdvice = `Focus on acquiring certifications or building projects in missing technologies like the required stack. Highlight your specific contributions to business results in your experience section.`;
  } else {
    summary = `${name}'s resume is well-structured and displays competence in ${structuredResume.skills.slice(0, 3).join(', ') || 'software development'}.`;
    careerAdvice = `To progress to more senior positions, aim to lead projects or design architectures. Document those scale and design contributions clearly in your project listings.`;
  }

  const detailedMarkdown = `
### Resume Evaluation Report for **${name}**
*Mode: 🎭 Dynamic Mock Simulation*

#### 1. ATS Matching Analysis
${hasJd ? `The candidate matches calculated JD parameters with an ATS Score of **${atsScore}%**. Check missing skills list to align keywords.` : 'No job description was provided to calculate an ATS matching score. Please supply a job description in the side panel for compatibility analysis.'}

#### 2. Structural & Layout Review
* **Experience & Projects**: Experience years estimated at **${structuredResume.experienceYears} years**.
* **Rule Violations**: Identified **${ruleViolations.length}** violations.
* **Overall Quality Score**: Calculated programmatically at **${qualityScore}%**.
`;

  return {
    summary,
    strengths,
    improvements,
    wordingImprovements,
    careerAdvice,
    detailedMarkdown
  };
}

function logGeminiError(error) {
  try {
    const logMessage = `[${new Date().toISOString()}] Key: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'undefined'} | Error: ${error.stack || error.message || error}\n`;
    fs.appendFileSync('gemini-errors.log', logMessage);
  } catch (logErr) {
    console.error('Failed to write to gemini-errors.log:', logErr);
  }
}
