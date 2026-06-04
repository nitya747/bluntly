# bluntly ⚡

A premium full-stack dashboard built on **Next.js (App Router)** and **Vanilla CSS** for candidates and recruiters to analyze and rank resume compatibility against job descriptions.

![Aesthetic](https://img.shields.io/badge/Aesthetic-Premium%20SaaS-purple)
![Next.js](https://img.shields.io/badge/Next.js-16.2.7-black)
![React](https://img.shields.io/badge/React-19.2.4-blue)

---

## Core Features
1. **Multi-Format Parsing**: Extracts text from both **PDF (`.pdf`)** and **LaTeX (`.tex`)** resumes.
2. **Adaptive Theming**:Persisted Light Theme and Dark Theme with custom CSS variables, custom scrollbars, and a responsive polka-dot background grid.
3. **Individual Analysis Mode**: Animated SVG ATS compatibility score gauges, section breakdown meters, color-coded skill matching chips, and tabbed feedback sections.
4. **Batch Analysis Mode**: Drag-and-drop file upload for up to 20 resumes processed in sequence. Real-time updates are streamed via **Server-Sent Events (SSE)**. Results are presented in a sortable ranking table with inline accordion detail reports and CSV/JSON downloading.

---

## Project Structure

```
bluntly/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyse/
│   │   │   │   └── route.js      # Individual analysis endpoint
│   │   │   └── batch/
│   │   │       └── route.js      # Batch streaming SSE endpoint
│   │   ├── globals.css           # CSS design system & utility classes
│   │   ├── layout.js             # HTML wrapper & Geist font configurations
│   │   └── page.js               # Root dashboard shell
│   ├── components/
│   │   ├── Sidebar.js            # Left-panel navigation & theme control
│   │   ├── Header.js             # Top-panel view switcher & AI status
│   │   ├── RightPanel.js         # Right-panel statistics & scan history
│   │   ├── IndividualView.js     # Single file upload & ATS report workspace
│   │   └── BatchView.js          # Batch matcher & Candidate ranking workspace
│   └── lib/
│       ├── parsers.js            # PDF & LaTeX plain text extraction
│       └── gemini.js             # Gemini 1.5 Flash client & Mock engine
├── package.json
└── README.md
```

---

## Getting Started

### 1. Install Dependencies
Run the package installation:
```bash
npm install
```

### 2. Configure Environment (Optional)
By default, the application runs in **🎭 Fallback Mock Mode** if no API key is set. To activate live Google Gemini AI, create a `.env.local` file at the root of the project:
```env
GEMINI_API_KEY=your_google_generative_ai_key
```

### 3. Run Development Server
Start Turbopack:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### 4. Build Production Bundle
To build and optimize for production:
```bash
npm run build
npm start
```

---

## API Specifications

### Single Resume Analysis
* **Endpoint**: `POST /api/analyse`
* **Form-Data Payload**:
  * `file`: Resume file (`.pdf`, `.tex`, `.txt`)
  * `jobDescription`: Target job requirements text
* **Returns**: JSON object detailing ATS match score, sections breakdown, skills, and strengths/improvements checklist.

### Batch Resume Ranking
* **Endpoint**: `POST /api/batch`
* **Form-Data Payload**:
  * `files`: Array of resume files (up to 20)
  * `jobDescription`: Target job requirements text
* **Returns**: `text/event-stream` streaming event messages:
  1. `init` -> Sets total file count
  2. `progress` -> Parsing/Analysing progress status per index
  3. `complete` -> Closes stream returning the complete ranked list
