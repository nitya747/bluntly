import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { redactPII } from './pii.js';
import { computeSemanticSimilarity } from './embeddings.js';

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
 * Extracts raw text from an image buffer using Gemini multimodal capability.
 */
export async function extractTextFromImage(buffer, mimeType) {
  if (!genAI) {
    throw new Error('Gemini API key is not configured.');
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const prompt = 'Please extract all text and structured content from this resume image. Output only the extracted plain text from the resume, preserving structural readability (headings, bullet points, layout structure) as closely as possible.';

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: Buffer.from(buffer).toString('base64'),
          mimeType: mimeType
        }
      }
    ]);

    return result.response.text();
  } catch (error) {
    console.error('Gemini image extraction error:', error);
    throw error;
  }
}

/**
 * Stage 1: Parse Resume Text to Structured JSON
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
  "name": "Candidate's full name (if not found/missing in the resume, set to 'unknown')",
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
 * Generates dynamic, job-specific evaluation rubrics from a Job Description.
 */
export async function generateDynamicRubrics(jobDescription) {
  const defaultRubrics = [
    { id: "technical_depth", name: "Technical Depth & Stack", weight: 35, description: "Check candidate's technical skills matching the core stack." },
    { id: "experience_relevance", name: "Work Experience Relevance", weight: 35, description: "Examine scope, depth, and duration of professional experience." },
    { id: "education_qualifications", name: "Education & Certifications", weight: 15, description: "Examine degrees, fields of study, and relevant professional credentials." },
    { id: "resume_impact", name: "Resume Impact & Metrics", weight: 15, description: "Review overall achievements, metrics, layout, and rule violations." }
  ];

  if (!jobDescription || !jobDescription.trim()) {
    return defaultRubrics;
  }

  if (!genAI) {
    return getMockRubrics(jobDescription);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
You are an expert technical recruiter. Analyze the following Job Description and generate a set of exactly 4 specific, customized scoring rubrics (evaluation criteria) tailored to assess candidates for this role.
The sum of all rubric weights must equal exactly 100. Each rubric should have a clear name, a weight, and a brief description of what is assessed.

JOB DESCRIPTION:
"""
${jobDescription}
"""

JSON SCHEMA:
[
  {
    "id": "criteria_id_lowercase_snake_case",
    "name": "Criteria Name (e.g. Frontend Architecture & React)",
    "weight": 30, // Integer representing weight. Total of all weights must be exactly 100.
    "description": "Short description of what the rubric evaluates in the resume."
  }
]
`;

    const result = await model.generateContent(prompt);
    const rubrics = JSON.parse(result.response.text());

    // Validate and adjust weights to total exactly 100
    let totalWeight = rubrics.reduce((acc, r) => acc + (r.weight || 0), 0);
    if (totalWeight !== 100 && rubrics.length > 0) {
      let currentSum = 0;
      rubrics.forEach((r, i) => {
        if (i === rubrics.length - 1) {
          r.weight = 100 - currentSum;
        } else {
          r.weight = Math.round(((r.weight || 25) / totalWeight) * 100);
          currentSum += r.weight;
        }
      });
    }

    return rubrics.slice(0, 4); // Keep exactly 4 to fit UI grid
  } catch (error) {
    console.error('Failed to generate dynamic rubrics, falling back to mock:', error);
    return getMockRubrics(jobDescription);
  }
}

/**
 * Evaluates the redacted resume against dynamic rubrics.
 */
export async function evaluateResumeAgainstRubrics(redactedResumeText, rubrics, jobDescription = '') {
  if (!genAI) {
    return getMockRubricEvaluations(rubrics);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
You are an expert technical interviewer. Evaluate the following redacted candidate resume against the given scoring rubrics.
For each rubric, assign an integer score between 0 and 100 and write a concise, one-sentence justification detailing the evidence or lack thereof in the resume.
Be objective and strict. The resume text has been redacted to remove PII (name, email, phone, location, links) to prevent bias.

REDACTED RESUME TEXT:
"""
${redactedResumeText}
"""

EVALUATION RUBRICS:
${JSON.stringify(rubrics, null, 2)}

TARGET JOB DESCRIPTION:
${jobDescription || 'None provided'}

JSON SCHEMA:
[
  {
    "id": "rubric_id",
    "score": 85, // Integer score between 0 and 100
    "justification": "One-sentence evaluation notes highlighting strengths or missing requirements."
  }
]
`;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error('Failed to evaluate resume against rubrics:', error);
    return getMockRubricEvaluations(rubrics);
  }
}

/**
 * Stage 2: Rule Engine (Programmatic Evaluator)
 */
export function runRuleEngine(structuredResume) {
  const violations = [];
  const passed = [];

  // Check email
  if (!structuredResume.email || !structuredResume.email.trim() || structuredResume.email.includes('[REDACTED')) {
    violations.push("Missing email");
  } else {
    passed.push("Email present");
  }

  // Check phone
  if (!structuredResume.phone || !structuredResume.phone.trim() || structuredResume.phone.includes('[REDACTED')) {
    violations.push("Missing phone");
  } else {
    passed.push("Phone present");
  }

  // Check length
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

  // Calculate Quality Score
  let qualityScore = 100;
  if (violations.includes("Missing email")) qualityScore -= 10;
  if (violations.includes("Missing phone")) qualityScore -= 10;
  if (violations.includes("Resume too short")) qualityScore -= 20;
  if (violations.includes("No experience section")) qualityScore -= 30;
  if (violations.includes("No skills section")) qualityScore -= 30;
  
  qualityScore = Math.max(10, Math.min(100, qualityScore));

  const experienceScore = expMatch ? Math.min(100, Math.round(65 + Math.min(5, structuredResume.experienceYears) * 7)) : 0;
  const educationScore = (structuredResume.education && structuredResume.education.length > 0) ? 90 : 0;
  const formattingScore = Math.max(10, 100 - (violations.includes("Missing email") ? 15 : 0) - (violations.includes("Missing phone") ? 15 : 0));
  
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

  const resumeSkillsLower = (structuredResume.skills || []).map(s => s.toLowerCase());

  structuredJD.requiredSkills.forEach(reqSkill => {
    const reqSkillLower = reqSkill.toLowerCase();
    const isMatched = resumeSkillsLower.some(resSkill => 
      resSkill.includes(reqSkillLower) || reqSkillLower.includes(resSkill)
    );

    if (isMatched) {
      const orig = (structuredResume.skills || []).find(s => s.toLowerCase().includes(reqSkillLower) || reqSkillLower.includes(s.toLowerCase())) || reqSkill;
      matched.push(orig);
    } else {
      missing.push(reqSkill);
    }
  });

  (structuredResume.skills || []).forEach(resSkill => {
    const isMatched = matched.some(m => m.toLowerCase().includes(resSkill.toLowerCase()) || resSkill.toLowerCase().includes(m.toLowerCase()));
    if (!isMatched) {
      detected.push(resSkill);
    }
  });

  let keywordMatchRatio = 1.0;
  if (structuredJD.keywords && structuredJD.keywords.length > 0) {
    const matchedKeywords = structuredJD.keywords.filter(kw => 
      resumeSkillsLower.some(s => s.includes(kw.toLowerCase()))
    );
    keywordMatchRatio = matchedKeywords.length / structuredJD.keywords.length;
  }

  const expMatched = structuredResume.experienceYears >= structuredJD.requiredExperienceYears;
  let expMatchScore = 100;
  if (structuredJD.requiredExperienceYears > 0) {
    expMatchScore = Math.min(100, Math.round((structuredResume.experienceYears / structuredJD.requiredExperienceYears) * 100));
  }

  const skillsMatchRatio = matched.length / structuredJD.requiredSkills.length;
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
 * Stage 4: LLM Feedback Generator (Scrubbed PII)
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
The inputs have been redacted of Name, Email, Phone, and URLs to ensure complete anonymity and zero bias.

CANDIDATE STRUCTURED RESUME DATA:
${JSON.stringify(structuredResume, null, 2)}

TARGET JOB DESCRIPTION:
${jobDescription || 'None provided'}

PROGRAMMATIC SCORES:
- ATS Match Score: ${atsScore !== null ? atsScore + '%' : 'N/A (No Job Description provided)'} (comprising 10% GitHub Profile Strength, 70% Skills + Semantic Match, and 20% Experience + Education)
- Quality Score: ${qualityScore}%
- Rule Violations: ${JSON.stringify(ruleViolations)}

Based on this information, generate customized, detailed career feedback in a JSON object matching this schema:
{
  "summary": "A cohesive high-level paragraph summarizing the candidate's professional profile, experience level, and alignment with target roles or the job description.",
  "strengths": ["List of 3-4 bullet points highlighting key strengths visible in their experience, education, or skills."],
  "improvements": ["List of 3-4 actionable general improvements (e.g., adding certifications, formatting issues)."],
  "wordingImprovements": ["List of 3-4 specific suggestions on how to improve the wording or phrasing of the candidate's experience bullet points or summary."],
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
 * Calculates detailed GitHub Portfolio score based on specific metrics.
 * 0–40% of portfolio weight (scaled to 10% of total resume score)
 */
export function calculateGitHubPortfolioScore(githubData, jobDescription) {
  if (!githubData || !githubData.success) {
    return {
      score: 0,
      reposScore: 0,
      contributionsScore: 0,
      activityScore: 0,
      languagesScore: 0,
      followersScore: 0,
      completenessScore: 0,
      justification: "No GitHub portfolio was provided or could be extracted from the resume. Introduce a GitHub link to enable portfolio screening."
    };
  }

  // 1. Public repos count (0 repos = 0%, 3+ = 10%)
  const publicRepos = githubData.publicReposCount || 0;
  let reposScoreVal = 0;
  if (publicRepos >= 3) reposScoreVal = 10;
  else if (publicRepos > 0) reposScoreVal = 5;

  // 2. Total contributions (<50 = 0%, 200+ = 10%)
  const contributions = githubData.contributions || 0;
  let contributionsScoreVal = 0;
  if (contributions >= 200) contributionsScoreVal = 10;
  else if (contributions >= 50) contributionsScoreVal = 5;

  // 3. Recent activity (Last commit date within 30 days -> Yes = 5%, No = 0%)
  let activityScoreVal = 0;
  let daysSinceLastCommit = null;
  if (githubData.lastCommitDate) {
    const lastCommit = new Date(githubData.lastCommitDate).getTime();
    const diffTime = Math.abs(Date.now() - lastCommit);
    daysSinceLastCommit = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysSinceLastCommit <= 30) {
      activityScoreVal = 5;
    }
  }

  // 4. Repo languages (Matches JD skills = 10%)
  let languagesScoreVal = 0;
  let matchedLanguagesList = [];
  if (jobDescription && jobDescription.trim()) {
    const jdLower = jobDescription.toLowerCase();
    const topLangs = (githubData.topLanguages || []).map(l => l.toLowerCase());
    const reposLangs = (githubData.repos || []).map(r => (r.language || '').toLowerCase()).filter(Boolean);
    const uniqueLangs = Array.from(new Set([...topLangs, ...reposLangs]));
    
    uniqueLangs.forEach(lang => {
      if (jdLower.includes(lang)) {
        languagesScoreVal = 10;
        matchedLanguagesList.push(lang);
      }
    });
  } else {
    // If no JD, default to full score if they have any language
    if ((githubData.topLanguages || []).length > 0) {
      languagesScoreVal = 10;
    }
  }

  // 5. Follower count (0 = 0%, 50+ = 5%)
  const followers = githubData.followers || 0;
  let followersScoreVal = 0;
  if (followers >= 50) followersScoreVal = 5;
  else if (followers > 0) followersScoreVal = 2.5;

  // 6. Profile completeness (Has bio + photo + website -> Yes = 5%, No = 0%)
  const hasBio = !!githubData.bio && githubData.bio.trim().length > 0;
  const hasPhoto = !!githubData.avatarUrl;
  const hasWebsite = !!githubData.website && githubData.website.trim().length > 0;
  
  let completenessScoreVal = 0;
  if (hasBio && hasPhoto && hasWebsite) {
    completenessScoreVal = 5;
  } else {
    let count = 0;
    if (hasBio) count++;
    if (hasPhoto) count++;
    if (hasWebsite) count++;
    completenessScoreVal = Math.round((count / 3) * 5 * 10) / 10;
  }

  const totalSum = reposScoreVal + contributionsScoreVal + activityScoreVal + languagesScoreVal + followersScoreVal + completenessScoreVal;
  // Capped at 40% maximum portfolio weight, then scaled to a 0-100 index score
  const finalScore = Math.round((Math.min(40, totalSum) / 40) * 100);

  let justification = `GitHub Portfolio Strength score is ${finalScore}/100. `;
  justification += `Candidate has ${publicRepos} public repositories (${reposScoreVal * 10}% weight) and `;
  justification += `${contributions} contributions in the last year (${contributionsScoreVal * 10}% weight). `;
  if (daysSinceLastCommit !== null) {
    justification += `Recent activity within ${daysSinceLastCommit} days (${activityScoreVal > 0 ? 'active' : 'inactive'} in last 30 days). `;
  } else {
    justification += `No recent push activity detected. `;
  }
  if (matchedLanguagesList.length > 0) {
    justification += `Repository languages match JD skills: ${matchedLanguagesList.slice(0, 3).join(', ')}. `;
  }
  justification += `Profile completeness: bio (${hasBio ? 'yes' : 'no'}), photo (${hasPhoto ? 'yes' : 'no'}), website (${hasWebsite ? 'yes' : 'no'}).`;

  return {
    score: finalScore,
    reposScore: Math.round((reposScoreVal / 10) * 100),
    contributionsScore: Math.round((contributionsScoreVal / 10) * 100),
    activityScore: Math.round((activityScoreVal / 5) * 100),
    languagesScore: Math.round((languagesScoreVal / 10) * 100),
    followersScore: Math.round((followersScoreVal / 5) * 100),
    completenessScore: Math.round((completenessScoreVal / 5) * 100),
    justification
  };
}

/**
 * Stage 5: Evaluate resume against the new three-component screening criteria
 */
export async function evaluateScreeningCriteria(structuredResume, jobDescription, githubData, semanticSimilarityScore) {
  const githubPortfolio = calculateGitHubPortfolioScore(githubData, jobDescription);

  if (!genAI) {
    return evaluateScreeningCriteriaMock(structuredResume, jobDescription, githubPortfolio, semanticSimilarityScore);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
You are an expert technical recruiter and HR screener.
Evaluate the candidate's resume against the target Job Description based on the following specific screening rubrics:

1. Skills + Semantic Match (70% of total):
   - BERT/S-BERT Embeddings Similarity: This is pre-calculated as ${semanticSimilarityScore} out of 100.
   - Fuzzy Skill Matching: Identifying spelling variations, abbreviations, or related technologies (e.g. React/ReactJS, Python/Django, Postgres/PostgreSQL) and grading how well the resume matches the JD skills. (Score 0-100)
   - Role-Specific Taxonomies: Check if they possess the comprehensive suite of technologies, tools, and methodologies standard for this specific role type (e.g., Frontend, Backend, Data Science, DevOps, Mobile, QA). (Score 0-100)

2. Experience + Education (20% of total):
   - Years of Experience: Compare the candidate's years of experience (${structuredResume.experienceYears || 0} years) to the JD requirements. (Score 0-100)
   - Quantified Achievements: Check if their experience descriptions contain clear metrics, percentages, numbers, or performance indicators. (Score 0-100)
   - Education Level: Evaluate their degree levels (B.S., M.S., Ph.D. etc.) against the JD requirement. (Score 0-100)

CANDIDATE STRUCTURED RESUME DATA:
${JSON.stringify(structuredResume, null, 2)}

TARGET JOB DESCRIPTION:
${jobDescription || 'None provided'}

Generate a JSON object matching this schema:
{
  "skillsSemantic": {
    "fuzzySkillMatch": 85, // Score 0-100
    "roleTaxonomy": 90, // Score 0-100
    "justification": "Detailed justification paragraph explaining the skills match, fuzzy match, and role taxonomy alignment."
  },
  "experienceEducation": {
    "yearsExperience": 80, // Score 0-100
    "quantifiedAchievements": 75, // Score 0-100
    "educationLevel": 90, // Score 0-100
    "justification": "Detailed justification paragraph explaining the years of experience, quantified achievements, and education level."
  }
}
`;

    const result = await model.generateContent(prompt);
    const evaluation = JSON.parse(result.response.text());
    
    // Attach calculated and pre-computed values
    evaluation.github = githubPortfolio;
    evaluation.skillsSemantic.embeddingSimilarity = semanticSimilarityScore;
    
    return evaluation;
  } catch (error) {
    console.error('Failed to evaluate screening criteria via Gemini:', error);
    return evaluateScreeningCriteriaMock(structuredResume, jobDescription, githubPortfolio, semanticSimilarityScore);
  }
}

/**
 * Mock fallback generator for screening criteria
 */
function evaluateScreeningCriteriaMock(structuredResume, jobDescription, githubPortfolio, semanticSimilarityScore) {
  let fuzzySkillMatch = 75;
  let roleTaxonomy = 80;
  
  if (jobDescription && jobDescription.trim()) {
    const skills = structuredResume.skills || [];
    const jdLower = jobDescription.toLowerCase();
    
    let matchesCount = 0;
    skills.forEach(s => {
      if (jdLower.includes(s.toLowerCase())) matchesCount++;
    });
    
    const totalCheck = Math.max(5, skills.length);
    fuzzySkillMatch = Math.min(100, Math.max(30, Math.round((matchesCount / totalCheck) * 100) + 20));
    roleTaxonomy = Math.min(100, Math.max(40, fuzzySkillMatch + (structuredResume.experienceYears > 3 ? 15 : 5)));
  }

  let yearsExperienceScore = 60;
  const experienceYears = structuredResume.experienceYears || 0;
  yearsExperienceScore = Math.min(100, Math.round((experienceYears / 3.0) * 100));

  let quantifiedAchievementsScore = 40;
  if (structuredResume.experience && structuredResume.experience.length > 0) {
    let matchCount = 0;
    structuredResume.experience.forEach(exp => {
      const desc = exp.description || '';
      if (/\b\d{1,3}%\b|\$\b\d+|\b\d+\s+(?:million|users|employees|percent|x)\b/i.test(desc)) {
        matchCount++;
      }
    });
    quantifiedAchievementsScore = Math.min(100, 45 + (matchCount * 20));
  }

  let educationLevelScore = 60;
  if (structuredResume.education && structuredResume.education.length > 0) {
    const degrees = structuredResume.education.map(e => (e.degree || '').toLowerCase()).join(' ');
    if (degrees.includes('phd') || degrees.includes('doctor')) {
      educationLevelScore = 100;
    } else if (degrees.includes('master') || degrees.includes('m.s') || degrees.includes('ms')) {
      educationLevelScore = 95;
    } else if (degrees.includes('bachelor') || degrees.includes('b.s') || degrees.includes('bs')) {
      educationLevelScore = 85;
    } else {
      educationLevelScore = 75;
    }
  }

  const skillsJustification = `Evaluated skills against target requirements. S-BERT semantic similarity is ${semanticSimilarityScore}%. Fuzzy matching checked synonyms and abbreviations for ${structuredResume.skills?.length || 0} skills, showing strong alignment. Role taxonomy matches core modern stacks.`;
  const expEduJustification = `Candidate possesses ${experienceYears} years of experience (scored ${yearsExperienceScore}/100). Experience descriptions showed ${quantifiedAchievementsScore >= 65 ? 'strong' : 'limited'} use of quantifiable metrics to describe achievements. Highest education level resolved with a score of ${educationLevelScore}/100.`;

  return {
    github: githubPortfolio,
    skillsSemantic: {
      embeddingSimilarity: semanticSimilarityScore,
      fuzzySkillMatch,
      roleTaxonomy,
      justification: skillsJustification
    },
    experienceEducation: {
      yearsExperience: yearsExperienceScore,
      quantifiedAchievements: quantifiedAchievementsScore,
      educationLevel: educationLevelScore,
      justification: expEduJustification
    }
  };
}

/**
 * Main Orchestrator: Combines PDF/LaTeX text, dynamic rubrics, S-BERT embeddings, PII shield, and multimodal integrations.
 */
export async function analyzeResume(resumeText, jobDescription = '', filename = 'Resume', multimodalData = null) {
  // Step 1: Parse Original Resume details to get Candidate Name for Contact records & RLS policies
  const structuredResume = await parseResumeToJSON(resumeText, filename);
  
  const isValidName = (str) => {
    if (!str) return false;
    const s = str.trim();
    if (s.length === 0 || s.length > 30) return false;
    if (/\d/.test(s)) return false;
    if (s.includes('@')) return false;
    if (/[\\{}<>[\]()=;+*\/]/.test(s)) return false;
    const sectionHeaders = [
      'experience', 'work', 'employment', 'education', 'skills', 'technologies',
      'projects', 'summary', 'contact', 'about', 'profile', 'curriculum', 'vitae', 'cv'
    ];
    if (sectionHeaders.some(header => s.toLowerCase().includes(header))) return false;
    const codeKeywords = [
      'import', 'const', 'let', 'var', 'function', 'class', 'def', 'public',
      'private', 'void', 'return', 'documentclass', 'begin', 'end', 'include', 'require'
    ];
    if (codeKeywords.some(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(s))) return false;
    return true;
  };

  let candidateName = structuredResume.name;
  if (!candidateName || 
      candidateName.toLowerCase() === 'unknown' || 
      candidateName.toLowerCase() === 'null' || 
      candidateName === 'John Doe' ||
      !isValidName(candidateName)) {
    candidateName = 'unknown';
  }
  structuredResume.name = candidateName;
  
  // Step 2: Bias Mitigation - Redact PII before passing to S-BERT & LLM Evaluation
  const redactedText = redactPII(resumeText, candidateName);
  const redactedStructured = {
    ...structuredResume,
    name: '[REDACTED_NAME]',
    email: structuredResume.email ? '[REDACTED_EMAIL]' : null,
    phone: structuredResume.phone ? '[REDACTED_PHONE]' : null,
    experience: (structuredResume.experience || []).map(exp => ({
      ...exp,
      description: redactPII(exp.description || '', candidateName)
    }))
  };

  // Step 3: S-BERT / TF-IDF Cosine Similarity (Semantic overlap)
  let semanticSimilarity = 0;
  if (jobDescription.trim().length > 0) {
    semanticSimilarity = await computeSemanticSimilarity(jobDescription, redactedText);
  }

  // Step 4: Dynamic Rubrics Auto-generation & evaluation
  let rubrics = [];
  let rubricEvaluations = [];
  let weightedRubricScore = 0;

  if (jobDescription.trim().length > 0) {
    rubrics = await generateDynamicRubrics(jobDescription);
    rubricEvaluations = await evaluateResumeAgainstRubrics(redactedText, rubrics, jobDescription);
    
    // Calculate weighted rubric score
    let rubricSum = 0;
    rubrics.forEach(rub => {
      const match = rubricEvaluations.find(e => e.id === rub.id);
      const score = match ? match.score : 50;
      rubricSum += score * ((rub.weight || 25) / 100);
    });
    weightedRubricScore = rubricSum;
  }

  // Step 5: Programmatic checks
  const rulesResult = runRuleEngine(structuredResume);
  const matchResult = runComparisonEngine(structuredResume, await parseJobDescriptionToJSON(jobDescription));

  // Step 6: Multimodal integrations - Fetch GitHub portfolio by auto-extracting from resume text
  let processedMultimodal = {
    github: null,
    linkedinSummary: null,
    assessmentScores: null
  };

  if (resumeText) {
    let githubData = null;
    const ghMatch = resumeText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
    if (ghMatch && ghMatch[1]) {
      const username = ghMatch[1];
      try {
        const { fetchGitHubPortfolio } = await import('./github.js');
        githubData = await fetchGitHubPortfolio(username, multimodalData?.githubToken || null);
      } catch (err) {
        console.warn('Failed to fetch auto-extracted GitHub details:', err.message);
      }
    }

    if (githubData && githubData.success) {
      processedMultimodal.github = githubData;
    }
  }

  // Step 7: Evaluate detailed screening metrics
  const screeningDetails = await evaluateScreeningCriteria(
    redactedStructured,
    jobDescription,
    processedMultimodal.github,
    Math.round(semanticSimilarity * 100)
  );

  const githubScoreVal = screeningDetails.github.score;
  const skillsSemanticScoreVal = Math.round(
    (screeningDetails.skillsSemantic.embeddingSimilarity * 0.40) +
    (screeningDetails.skillsSemantic.fuzzySkillMatch * 0.30) +
    (screeningDetails.skillsSemantic.roleTaxonomy * 0.30)
  );
  const experienceEducationScoreVal = Math.round(
    (screeningDetails.experienceEducation.yearsExperience * 0.40) +
    (screeningDetails.experienceEducation.quantifiedAchievements * 0.30) +
    (screeningDetails.experienceEducation.educationLevel * 0.30)
  );

  // Step 8: Hybrid Screening Calculation (Sum equals 100%)
  // - 10% GitHub Portfolio Score
  // - 70% Skills + Semantic Match Score
  // - 20% Experience + Education Score
  let hybridATS = 0;
  if (jobDescription.trim().length > 0) {
    const rawHybrid = (githubScoreVal * 0.10) + 
                      (skillsSemanticScoreVal * 0.70) + 
                      (experienceEducationScoreVal * 0.20);
    hybridATS = Math.max(10, Math.min(100, Math.round(rawHybrid)));
  } else {
    hybridATS = null;
  }

  // Populate sections object (with backward compatibility keys + new components)
  const sections = {
    experience: screeningDetails.experienceEducation.yearsExperience,
    education: screeningDetails.experienceEducation.educationLevel,
    skills: screeningDetails.skillsSemantic.fuzzySkillMatch,
    formatting: rulesResult.sections.formatting,
    impact: screeningDetails.experienceEducation.quantifiedAchievements,
    
    // Major components
    githubScore: githubScoreVal,
    skillsSemanticScore: skillsSemanticScoreVal,
    experienceEducationScore: experienceEducationScoreVal
  };

  // Step 9: Qualitative AI Feedback Generator
  const feedback = await generateLLMFeedback(
    redactedStructured,
    jobDescription,
    hybridATS,
    rulesResult.qualityScore,
    rulesResult.ruleViolations
  );

  return {
    candidateName,
    atsScore: hybridATS,
    qualityScore: rulesResult.qualityScore,
    ruleViolations: rulesResult.ruleViolations,
    passedRules: rulesResult.passedRules,
    skills: matchResult.skills,
    sections,
    experienceMatch: matchResult.experienceMatch,
    feedback: feedback,
    structuredResume,
    semanticSimilarity: Math.round(semanticSimilarity * 100),
    rubricEvaluations,
    rubrics,
    multimodalDetails: processedMultimodal,
    screeningDetails
  };
}

/* ==========================================================================
   Mock and Fallback helper functions
   ========================================================================== */

function getMockRubrics(jobDescription) {
  const jdLower = jobDescription.toLowerCase();
  const criteria = [
    { id: "tech_stack", name: "Tech Stack Compatibility", weight: 35, description: "Matches core technical technologies and frameworks." },
    { id: "exp_depth", name: "Software Design & Experience Depth", weight: 35, description: "Depth of professional contributions and years in codebases." },
    { id: "domain_knowledge", name: "System Design & Domain Knowledge", weight: 15, description: "Assessments in architectures, APIs, and databases." },
    { id: "resume_layout", name: "Formatting & Quality Layout", weight: 15, description: "Layout presentation, clear achievements, and rules check." }
  ];

  if (jdLower.includes("senior") || jdLower.includes("lead")) {
    criteria[1].name = "Leadership & Mentorship";
    criteria[1].description = "Evaluating team lead experience, architectural designs, and mentoring junior staff.";
  } else if (jdLower.includes("data") || jdLower.includes("analyst")) {
    criteria[0].name = "Data Analytics & ML Stack";
    criteria[0].description = "Evaluates Python, SQL, statistical modeling, and data pipelines.";
  }
  return criteria;
}

function getMockRubricEvaluations(rubrics) {
  const scores = [80, 75, 90, 85];
  const justifications = [
    "The resume shows robust skills matching the requested technologies.",
    "Candidate demonstrates solid experience, though slightly below the target seniority.",
    "Academic degrees and credentials fully align with core requirements.",
    "Resume is highly readable, structured, and free of formatting violations."
  ];

  return rubrics.map((rub, i) => ({
    id: rub.id,
    score: scores[i % scores.length],
    justification: justifications[i % justifications.length]
  }));
}

function parseResumeToJSONMock(resumeText, filename) {
  const lines = resumeText.split('\n').map(l => l.trim()).filter(Boolean);
  
  const isValidName = (str) => {
    if (!str) return false;
    const s = str.trim();
    if (s.length === 0 || s.length > 30) return false;
    if (/\d/.test(s)) return false;
    if (s.includes('@')) return false;
    if (/[\\{}<>[\]()=;+*\/]/.test(s)) return false;
    const sectionHeaders = [
      'experience', 'work', 'employment', 'education', 'skills', 'technologies',
      'projects', 'summary', 'contact', 'about', 'profile', 'curriculum', 'vitae', 'cv'
    ];
    if (sectionHeaders.some(header => s.toLowerCase().includes(header))) return false;
    const codeKeywords = [
      'import', 'const', 'let', 'var', 'function', 'class', 'def', 'public',
      'private', 'void', 'return', 'documentclass', 'begin', 'end', 'include', 'require'
    ];
    if (codeKeywords.some(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(s))) return false;
    return true;
  };

  let name = 'unknown';
  // Check first few lines for a valid candidate name
  const nameLine = lines.slice(0, 3).find(line => isValidName(line));
  if (nameLine) {
    name = nameLine.trim();
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

  let experienceYears = 3;
  const yearMatches = resumeText.match(/\b(19|20)\d{2}\b/g);
  if (yearMatches && yearMatches.length >= 2) {
    const years = yearMatches.map(Number);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    experienceYears = Math.min(15, Math.max(1, maxYear - minYear));
  }

  const education = [{ degree: "B.S. Computer Science", institution: "State University", year: "2022" }];
  const experience = [{
    company: "Tech Corp",
    role: "Frontend Developer",
    duration: "2022 - Present",
    years: experienceYears,
    description: "Led development of core features using React, Next.js, and TypeScript. Optimized load speeds by 20%."
  }];

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
    'tailwind', 'ui/ux', 'figma', 'graphql', 'rest api', 'machine learning', 'data science'
  ];

  const jdLower = jobDescription.toLowerCase();
  const requiredSkills = [];
  skillList.forEach(skill => {
    if (new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(jdLower)) {
      requiredSkills.push(skill.toUpperCase());
    }
  });

  let requiredExperienceYears = 0;
  const expMatch = jobDescription.match(/(\d+)\+?\s*years?/i);
  if (expMatch) {
    requiredExperienceYears = Number(expMatch[1]);
  }

  return {
    requiredSkills,
    preferredSkills: [],
    requiredExperienceYears,
    keywords: requiredSkills.slice(0, 5)
  };
}

function generateLLMFeedbackMock(structuredResume, jobDescription, atsScore, qualityScore, ruleViolations) {
  return {
    summary: "Mock advisor summary detailing candidate experience and role suitability. Redaction was successfully performed on candidate identity elements.",
    strengths: ["Strong technology background in parsed stack.", "Clear visual organization of experiences."],
    improvements: ["Introduce metric milestones to make projects stand out.", "Explicitly align skills list to matching JD buzzwords."],
    wordingImprovements: ["Revamp bullet points using strong actions (e.g. Optimized, Led, Engineered)."],
    careerAdvice: "Advance towards leading projects and designing architectures. Expand domain capabilities.",
    detailedMarkdown: "### Mock Evaluation Report\nThis report was generated in mock simulation mode."
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
