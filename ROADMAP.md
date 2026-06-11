# Bluntly ⚡ Product Roadmap

This document outlines the vision and timeline for upcoming features in Bluntly. We welcome open-source contributions to help speed up these goals!

---

## 🗺️ Future Vision

```
  Phase 1             Phase 2             Phase 3             Phase 4
  [Offline Core] ---> [Resume Builder] -> [Multi-Model] ----> [Job Companion]
  Transformers.js     LaTeX Exporter      Claude & Llama      Chrome Extension
```

---

## 🚀 Phase 1: Offline Core & Parsing Extensions (Q3 2026)
*Goal: Remove external dependencies and optimize local text parsing.*
- [ ] **Fully Offline Semantic Scoring**: Improve local score calculations using `@huggingface/transformers` to run tokenization and semantic similarity in-browser without any network requests.
- [ ] **LaTeX Client Parsing**: Build a robust, client-side LaTeX parser that handles complex macros and custom style tags directly in the browser UI.
- [ ] **DOCX Parsing Support**: Add support for parsing `.docx` resumes natively using pure client-side libraries.

## 🎨 Phase 2: Resume Builder & LaTeX Exporter (Q4 2026)
*Goal: Turn Bluntly from an analyzer into an interactive optimizer.*
- [ ] **Interactive Suggestions Editor**: Allow candidates to click on a suggestion (e.g. "Add details about React hooks") and edit their resume text directly in the dashboard workspace.
- [ ] **Tailored LaTeX Exporters**: Provide pre-optimized LaTeX templates designed specifically for Software Engineering, Data Science, and PM roles, enabling students to download their optimized resumes in one click.

## 🧠 Phase 3: Multi-Model Ecosystem Support (Q1 2027)
*Goal: Support alternative Large Language Models.*
- [ ] **Anthropic Claude Support**: Integrate Claude 3.5 Sonnet and Haiku via BYOK.
- [ ] **Local LLM Parsing**: Allow integration with local inference engines (Ollama, LM Studio) running locally on student hardware (`localhost:11434`) to guarantee absolute privacy with zero API costs.

## 💼 Phase 4: Job Application Companion (Q2 2027)
*Goal: Integrate Bluntly directly into the application process.*
- [ ] **Bluntly Chrome Extension**: Parse job descriptions automatically from platforms like LinkedIn, Indeed, and greenhouse.io, and score your resume without leaving the job board page.
- [ ] **Automated Fit Logs**: Keep track of matching scores, target roles, and resume variants in a local scans history dashboard to organize the internship search.
