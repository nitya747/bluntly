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
 * @returns {Promise<string>} The extracted text content.
 */
export async function parseResume(buffer, filename) {
  const extension = filename.split('.').pop().toLowerCase();

  if (extension === 'pdf') {
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      return result.text || '';
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
  } else {
    throw new Error(`Unsupported file format: .${extension}. Only PDF and LaTeX (.tex) files are supported.`);
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
