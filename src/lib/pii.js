/**
 * Utility to scrub Personally Identifiable Information (PII) from resume text
 * before passing it to AI evaluation engines to mitigate bias.
 */

export function redactPII(text, candidateName = '') {
  if (!text) return '';
  let redacted = text;

  // 1. Redact Emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  redacted = redacted.replace(emailRegex, '[REDACTED_EMAIL]');

  // 2. Redact Phone Numbers
  // Matches standard 10-digit formats (e.g. +1-555-555-5555) as well as 7-digit local formats (e.g. +1-555-0199)
  const phoneRegex = /(?:\+?\d{1,3}[ -.\/()]*)?\(?\d{3}\)?[ -.\/()]*\d{3}[ -.\/()]*\d{4}\b|(?:\+?\d{1,3}[ -.\/()]*)?\b\d{3}[ -.\/()]*\d{4}\b/g;
  redacted = redacted.replace(phoneRegex, '[REDACTED_PHONE]');

  // 3. Redact Social Profile & Website Links
  // Captures github, linkedin, personal sites, etc. including full path names
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:github|linkedin|gitlab|twitter|x|behance|medium|dribbble)\.com\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*/gi;
  redacted = redacted.replace(urlRegex, '[REDACTED_LINK]');

  // Generic website link regex
  const webRegex = /https?:\/\/(?!\[REDACTED)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
  redacted = redacted.replace(webRegex, '[REDACTED_LINK]');

  // 4. Redact Zip Codes / Postal Codes
  const zipRegex = /\b\d{5}(?:-\d{4})?\b/g;
  redacted = redacted.replace(zipRegex, '[REDACTED_ZIP]');

  // 4b. Redact Geographic Locations (City, State)
  const states = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY';
  const locationRegex = new RegExp('\\b[A-Z][a-zA-Z\\s]{2,20},\\s*(?:' + states + ')\\b', 'g');
  redacted = redacted.replace(locationRegex, '[REDACTED_LOCATION]');

  // Redact explicit location labels: "Address: Seattle, WA" or similar
  const locationKeywords = /\b(?:location|address|lives in|based in|resides in|city|state)\b\s*:\s*([a-zA-Z\s.-]+)/gi;
  redacted = redacted.replace(locationKeywords, (match, p1) => {
    if (p1.trim().includes('[REDACTED')) return match;
    return match.replace(p1, ' [REDACTED_LOCATION] ');
  });

  // 5. Redact Candidate Name
  if (candidateName && candidateName.trim().length > 2 && candidateName.toLowerCase() !== 'unknown') {
    const cleanName = candidateName.trim();
    // Escape regex characters
    const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`\\b${escapedName}\\b`, 'gi');
    redacted = redacted.replace(nameRegex, '[REDACTED_NAME]');

    // Also redact parts of the name (e.g. "John" or "Doe" separately if they are single words)
    const nameParts = cleanName.split(/\s+/).filter(part => part.length > 2 && !/^(resume|cv|file)$/i.test(part));
    nameParts.forEach(part => {
      const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const partRegex = new RegExp(`\\b${escapedPart}\\b`, 'gi');
      redacted = redacted.replace(partRegex, '[REDACTED_NAME]');
    });
  }

  // Double check any trailing generic name patterns if found
  const candidateRefRegex = /\b(?:Candidate Name|Name)\b\s*:\s*[a-zA-Z\s.-]+/gi;
  // If there's a line matching "Candidate: John Doe", redact John Doe
  redacted = redacted.replace(/(?:candidate|name)\s*:\s*([a-zA-Z\s]{2,})/gi, (match, p1) => {
    // If it's not already redacted
    if (p1.trim().includes('[REDACTED')) return match;
    return match.replace(p1, ' [REDACTED_NAME] ');
  });

  return redacted;
}
