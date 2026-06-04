# Resume Analyser — Implementation Plan

## Project Vision
The **Resume Analyser** is a premium full-stack dashboard built on **Next.js (App Router)**. It provides a visual interface for candidates and recruiters to analyze and rank resume compatibility against job descriptions. The design features a modern 3-panel dashboard (Sidebar, Main Workspace, Right Overview Panel) with fluid transitions between Light and Dark themes, purple-to-pink gradient accents, and a polka-dot background texture matching a premium SaaS look.

---

## Core Features
1. **Multi-Format Parsing**: Supports both **PDF (`.pdf`)** and **LaTeX (`.tex`)** resumes.
2. **Adaptive Theming**: Persisted Light Theme (`#F8F4FF` bg, purple drop shadows) and Dark Theme (`#0F0E17` bg, subtle card border glow).
3. **Individual Analysis Mode**: Interactive score gauges, matching/missing skills chips, and tabbed feedback sections.
4. **Batch Analysis Mode**: Up to 20 files uploaded concurrently, real-time status updates streamed via **Server-Sent Events (SSE)**, sortable ranking table, and CSV/JSON metadata exporting.

---

## Phase 1 — Project Scaffolding & API Services
> **Goal**: Initialize Next.js project directory, establish style tokens, build file parsers, and configure backend API routes with mock fallbacks.

### Deliverables
* **Boilerplate**: Next.js App Router initialized in the workspace directory.
* **Design Tokens & Theme variables**: Setup of global CSS custom variables in `src/app/globals.css` for both light and dark themes.
* **Resume Parsers**:
  * PDF parser using `pdf-parse` (or standard parser compatible with Next.js API routes).
  * LaTeX parser reading raw `.tex` source as plain text.
* **AI Analysis Service**: Interface to Google Gemini 1.5 Flash using `@google/generative-ai`. Integrates a **mock data fallback** when no API key is defined in the environmental config.
* **Next.js API Routes**:
  * `POST /api/analyse` — individual file processing.
  * `POST /api/batch` — Server-Sent Events (SSE) streaming progress indicator and ranked results.

### ✅ Phase 1 Checkpoint
- [ ] Dev server running (`npm run dev`) on port 3000.
- [ ] Direct curl/fetch to `/api/analyse` parses and analyzes PDF/LaTeX files.
- [ ] `/api/batch` correctly streams status events (`init` → `progress` → `complete`).

---

## Phase 2 — Dashboard Shell & Layout System
> **Goal**: Structure the responsive 3-panel dashboard workspace.

### Deliverables
* **Sidebar Layout**: Collapsible left panel containing Logo, Navigation items (Individual, Batch, History, Settings), and Theme Toggle control (☀️/🌙).
* **Header Bar**: Current mode status indicators and active AI Mode Badge (🎭 Mock / 🤖 Gemini AI).
* **Polka-Dot Background**: Decorative background system responsive to active theme.
* **Mode Selector**: Pill-style navigation switch to select between **Individual** and **Batch** workspace views.

### ✅ Phase 2 Checkpoint
- [ ] Light & Dark themes switch fluidly and persist to `localStorage`.
- [ ] Sidebar collapses on smaller viewports.
- [ ] Mode selector toggle switches workspace views without page reload.

---

## Phase 3 — Individual Mode (Upload & Feedback Panels)
> **Goal**: Enable single-file upload, trigger analysis, and render a deep-dive results dashboard.

### Deliverables
* **UploadZone Component**: Drop area accepting `.pdf` and `.tex` formats, rendering file size, type badges, and clear/replace tools.
* **JobDescriptionBox**: Text input area with keyword optimization helper metrics.
* **Dual Gauge Charts**: SVG score rings showing ATS Score and Overall Resume Quality Score with animated value count-ups.
* **Skills Dashboard**: Color-coded chips distinguishing **Matched** (green), **Missing** (red), and **Detected** (purple) keywords.
* **Section Breakdown Chart**: Horizontal progress indicators scoring resume sections (Experience, Education, Formatting, Impact).
* **Feedback Tabs**: Tabbed navigation card for Summary, Strengths (bulleted checklists), Improvements (actionable suggestions), and Detailed Markdown feedback.

### ✅ Phase 3 Checkpoint
- [ ] Uploading single PDF or LaTeX file renders loading skeletons and then results.
- [ ] Missing/Matched skill categories display accurately if job description text is supplied.
- [ ] ATS Score gauge hides gracefully if job description is blank.

---

## Phase 4 — Batch Mode (SSE Progress & Rank Comparison)
> **Goal**: Process multiple files in sequence, track progress live, rank candidates, and export results.

### Deliverables
* **Batch UploadZone**: Drag-and-drop support for up to 20 files (`.pdf` and `.tex` combined).
* **SSE Live Feed**: Status cards displaying realtime file state (Queued, Parsing, Analysing, Completed, Error) with live progress bar.
* **Ranking Table**: Sortable table rows containing candidate Rank, Name, File Format, ATS Score, Quality Score, and Top Skills.
* **Accordion Detail Cards**: Row expansion opening full Individual results panels inline.
* **Export Bar**: CSV and JSON format extraction utilities.

### ✅ Phase 4 Checkpoint
- [ ] Drag-and-drop batch of 3+ files streams progress live.
- [ ] Clicking table headers sorts rows dynamically.
- [ ] Selecting a table row opens the correct individual candidate overview.
- [ ] CSV/JSON downloads match current table metrics.

---

## Phase 5 — Polish, Errors & Final Verification
> **Goal**: Add UI motion micro-interactions, responsive sizing fixes, and error state handling.

### Deliverables
* **Micro-interactions**: Pulse states on file drops, hover transition animations on dashboard components, and staggered table row loads.
* **Error Bounds**: Graceful fallback rendering for PDF/LaTeX parsing failures or network drops.
* **Documentation**: Full setup and environment configuration instructions.

### ✅ Phase 5 Checkpoint
- [ ] App is fully accessible and responsive on mobile and desktop viewports.
- [ ] Handlers display errors cleanly to the user.
- [ ] Project documentation is complete.
