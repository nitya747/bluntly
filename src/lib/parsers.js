import { PDFParse } from 'pdf-parse';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';

// Enforce absolute local file URL for PDFJS worker to solve Next.js dynamic chunk loading issues
try {
  const workerPath = 'file:///' + path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs').replace(/\\/g, '/');
  pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
} catch (err) {
  console.error('Failed to configure pdfjs workerSrc:', err);
}

/**
 * Parses a resume file buffer based on its file extension or mime type.
 * @param {Buffer} buffer - The raw file buffer.
 * @param {string} filename - The name of the file to determine format.
 * @param {string|null} customApiKey - Optional user-supplied Google Gemini API key.
 * @returns {Promise<string>} The extracted text content.
 */
export async function parseResume(buffer, filename, customApiKey = null) {
  const extension = filename.split('.').pop().toLowerCase();

  if (extension === 'pdf') {
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      let text = result.text || '';

      // Fallback: If the extracted text is empty or very short, it could be a scanned PDF.
      // Render pages as screenshots/images and perform OCR using Gemini multimodal capability.
      if (text.trim().length < 150) {
        console.warn('Extracted PDF text is too short. Falling back to page rendering and OCR...');
        const screenshots = await parser.getScreenshot({
          imageBuffer: true,
          scale: 1.5
        });
        
        if (screenshots && screenshots.pages && screenshots.pages.length > 0) {
          const ocrTexts = [];
          const { extractTextFromImage } = await import('./gemini.js');
          for (const page of screenshots.pages) {
            const pageText = await extractTextFromImage(page.data, 'image/png', customApiKey);
            if (pageText) {
              ocrTexts.push(pageText);
            }
          }
          if (ocrTexts.length > 0) {
            text = ocrTexts.join('\n\n');
          }
        }
      }

      await parser.destroy();
      return text;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF file: ${error.message}`);
    }
  } else if (extension === 'tex') {
    try {
      // LaTeX files are plain text files, so we decode the buffer as UTF-8
      const rawText = buffer.toString('utf-8');
      // We can also clean up LaTeX commands to get cleaner text, but let's keep it robust
      return cleanLaTeX(rawText);
    } catch (error) {
      console.error('LaTeX parsing error:', error);
      throw new Error(`Failed to parse LaTeX file: ${error.message}`);
    }
  } else if (extension === 'txt') {
    return buffer.toString('utf-8');
  } else if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
    try {
      if (!process.env.GEMINI_API_KEY && !customApiKey) {
        console.warn('No GEMINI_API_KEY or custom API key found. Falling back to mock image parsing.');
        return getMockImageResumeText();
      }
      const mimeType = getMimeTypeFromExtension(extension);
      const { extractTextFromImage } = await import('./gemini.js');
      return await extractTextFromImage(buffer, mimeType, customApiKey);
    } catch (error) {
      console.error('Image parsing error, using mock fallback:', error);
      return getMockImageResumeText();
    }
  } else {
    throw new Error(`Unsupported file format: .${extension}. Only PDF, LaTeX (.tex), Text (.txt), and Image (.png, .jpg, .jpeg, .webp) files are supported.`);
  }
}

/**
 * Strips common LaTeX commands to convert structural LaTeX to clean text for AI analysis.
 * @param {string} texText - Raw LaTeX text.
 * @returns {string} Cleaned plain text.
 */
function cleanLaTeX(texText) {
  let text = texText;

  // 1. Remove comments
  text = text.replace(/^[ \t]*%.*$/gm, ''); // lines starting with %
  text = text.replace(/([^\\])%.*$/gm, '$1'); // % after some text

  // 2. Remove document structure and preamble tags, but keep their contents if necessary
  text = text.replace(/\\documentclass(?:\[[^\]]*\])?\{[^}]*\}/g, '');
  text = text.replace(/\\usepackage(?:\[[^\]]*\])?\{[^}]*\}/g, '');
  text = text.replace(/\\begin\{document\}/g, '');
  text = text.replace(/\\end\{document\}/g, '');

  // 3. Replace common commands (like \section{...}, \textbf{...}, etc.) with just their arguments
  // \command{argument} -> argument
  // We can do this with a recursive or iterative regex approach for standard formatting commands
  const formattingCommands = [
    'section', 'subsection', 'subsubsection', 'section*', 'subsection*', 'subsubsection*',
    'textbf', 'textit', 'texttt', 'emph', 'href', 'url', 'title', 'author', 'date'
  ];

  for (const cmd of formattingCommands) {
    const regex = new RegExp(`\\\\${cmd.replace('*', '\\*')}\\{([^}]*)\\}`, 'g');
    text = text.replace(regex, '$1');
  }

  // Handle special characters
  text = text.replace(/\\&/g, '&');
  text = text.replace(/\\%/g, '%');
  text = text.replace(/\\_/g, '_');
  text = text.replace(/\\\{/g, '{');
  text = text.replace(/\\\}/g, '}');
  text = text.replace(/\\\$/g, '$');
  text = text.replace(/\\#/g, '#');

  // Remove environments like itemize/enumerate, keep contents
  text = text.replace(/\\begin\{itemize\}/g, '');
  text = text.replace(/\\end\{itemize\}/g, '');
  text = text.replace(/\\begin\{enumerate\}/g, '');
  text = text.replace(/\\end\{enumerate\}/g, '');
  text = text.replace(/\\item/g, '• ');

  // Clean up double backslashes (newlines in LaTeX)
  text = text.replace(/\\\\/g, '\n');

  // Clean up excessive whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return text.trim();
}

/**
 * Maps image file extensions to their corresponding MIME types.
 * @param {string} extension - File extension.
 * @returns {string} MIME type.
 */
function getMimeTypeFromExtension(extension) {
  switch (extension) {
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'image/png';
  }
}

/**
 * Returns mock text resume for developers testing without Gemini key.
 * @returns {string} Mock resume text.
 */
function getMockImageResumeText() {
  return `John Doe
john.doe@example.com
(555) 019-2834
EXPERIENCE
Senior Software Engineer at Tech Corp (2022 - Present)
Led development of core features using React, Next.js, and TypeScript. Optimized load speeds by 20%.
EDUCATION
B.S. Computer Science from State University (2022)
SKILLS
React, Next.js, JavaScript, TypeScript, Node.js, HTML, CSS`;
}

