# bluntly ⚡

A premium, open-source AI Resume Analyser & Candidate Matcher. Bluntly parses, scrubs, evaluates, and ranks resumes against job descriptions using Google Gemini 1.5 Flash and a heuristic compliance engine.

<div align="center">
  
  ![Aesthetic](https://img.shields.io/badge/Aesthetic-Premium%20SaaS-purple?style=for-the-badge)
  ![Next.js](https://img.shields.io/badge/Next.js-16.2.7-black?style=for-the-badge&logo=nextdotjs)
  ![React](https://img.shields.io/badge/React-19.2.4-blue?style=for-the-badge&logo=react)
  ![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-green?style=for-the-badge&logo=supabase)
  ![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange?style=for-the-badge&logo=google)
  ![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

</div>

---

## 🌟 Key Features

### 🔒 Privacy-First PII Redaction
Built-in PII scrubbing via [pii.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/lib/pii.js) runs locally in the browser/server environment. It automatically redacts emails, phone numbers, location addresses, social profiles (LinkedIn, GitHub, etc.), and candidate names before transmitting any data to AI endpoints to prevent unconscious bias and safeguard data privacy.

### 🧠 Hybrid Assessment Engine
Powered by [gemini.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/lib/gemini.js), the evaluation combines:
1. **Dynamic Rubric Generation**: Tailored candidate benchmarks generated on-the-fly based on the target job requirements.
2. **Heuristic Rule Engine**: Code-based checks for resume quality (page-length optimization, font/formatting heuristics, buzzword density, and contact details integrity).
3. **Hard Requirements Comparison**: Checks for education thresholds, specific technologies, and minimum years of experience.
4. **GitHub Portfolio Scoring**: Integrates public candidate data fetched via [github.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/lib/github.js) (repos, stars, activity, top languages) into the final fit score.

### ⚡ Individual & Batch Matching Views
- **Individual Analysis Mode** ([IndividualView.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/components/IndividualView.js)): View interactive gauge scores, section breakdown charts, color-coded skill chips, and tabbed lists showing specific strengths and recommendations.
- **Batch Analysis Mode** ([BatchView.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/components/BatchView.js)): Drag-and-drop up to 20 resumes concurrently. Updates stream via Server-Sent Events (SSE). Compare candidate profiles in a sortable ranking grid, view detail accordions, and download analysis as CSV/JSON.

### 🔑 Bring Your Own Key (BYOK)
Fully functional without server-side keys! Users can enter their personal Gemini API key in the settings panel to enable live AI parsing. If no key is configured, Bluntly defaults to a high-fidelity Mock Engine for zero-dependency evaluation.

---

## 📂 Project Architecture & Code Components

Below is the directory tree of the key modules in Bluntly. You can click on the file names to inspect their source code:

- **Database Configuration**:
  - [schema.sql](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/schema.sql): Sets up the scans database table and the Row Level Security (RLS) policies.
  - [schema_credits.sql](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/schema_credits.sql): Establishes candidate profile schemas and registration triggers for credit allocations.
- **Client & Server Logic Services**:
  - [parsers.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/lib/parsers.js): Text parsers extracting clean text from PDF and LaTeX inputs.
  - [pii.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/lib/pii.js): Local privacy script to redact candidate names, locations, email, phone numbers, and web profiles.
  - [gemini.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/lib/gemini.js): AI analysis pipelines, rule engines, tech comparison maps, and mockup evaluation fallbacks.
  - [github.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/lib/github.js): Fetcher and parser for public GitHub portfolios, calculating public activity points.
  - [embeddings.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/lib/embeddings.js): Text semantic similarity engine.
- **Supabase Utilities**:
  - [supabase/client.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/lib/supabase/client.js): Client-side Supabase connections.
  - [supabase/server.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/lib/supabase/server.js): Server-side Supabase middleware wrapper.
  - [supabase/profile.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/lib/supabase/profile.js): Database profile credit managers.
- **Frontend Views & Layouts**:
  - [Sidebar.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/components/Sidebar.js): Navigation sidebar supporting light/dark theme switches.
  - [Header.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/components/Header.js): Status bar tracking active AI model mode, login info, and current screen.
  - [IndividualView.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/components/IndividualView.js): Workspace layout for uploading and reading single candidate analysis details.
  - [BatchView.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/components/BatchView.js): SSE progress streaming dashboard displaying candidate tables and CSV downloads.
  - [HistoryView.js](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/components/HistoryView.js): Historic scans explorer.
  - [globals.css](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/src/app/globals.css): Global UI design values, variables, and typography definitions.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn

### 1. Clone & Install
```bash
git clone https://github.com/your-username/bluntly.git
cd bluntly
npm install
```

### 2. Configure Environment
Bluntly supports two operational modes:
- **Local Dev Mode** (Zero Config): Runs fully in local storage. All records, settings, keys, and history remain local to your browser.
- **Shared Database Mode** (Supabase): Stores users, credit limits, and analysis runs in a secure PostgreSQL database.

To set up the shared database mode, copy [.env.example](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/.env.example) to `.env.local` and populate it:
```bash
cp .env.example .env.local
```
Edit the file to configure your API keys:
- `GEMINI_API_KEY`: Global Gemini API key (optional; fallback is local user BYOK).
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project database URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase project public anon key.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🗄️ Database Setup

For shared database configurations, run the migration scripts within your **Supabase SQL Editor**:

1. **Scans Database**: Run [schema.sql](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/schema.sql) to create the scans index table and establish user isolation Row Level Security (RLS) policies.
2. **Credits & Profiles**: Run [schema_credits.sql](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/schema_credits.sql) to create user profile hooks that automatically allocate 3 initial credits on registration and allow credit tracking.

---

## 🛠️ API Reference

### 1. Single Analysis
- **Route**: `POST /api/analyse`
- **Headers**:
  - `x-api-key` (Optional): Custom Gemini API key override
- **Body** (`multipart/form-data`):
  - `file`: Resume file (`.pdf`, `.tex`, or `.txt`)
  - `jobDescription`: Target job requirements text
- **Returns**: JSON matching details including ATS scores, skill chips, alignment metrics, and action plans.

### 2. Streamed Batch Matcher
- **Route**: `POST /api/batch`
- **Headers**:
  - `x-api-key` (Optional): Custom Gemini API key override
- **Body** (`multipart/form-data`):
  - `files`: Array of resume files (up to 20)
  - `jobDescription`: Target job requirements text
- **Returns**: `text/event-stream` returning SSE events:
  - `init`: Total files configuration
  - `progress`: Status updates per resume file
  - `complete`: Final sorted candidate ranking array

---

## 🤝 Contribution & License

Contributions are welcome! Please submit a Pull Request or open an issue to suggest enhancements.

Distributed under the MIT License. See [LICENSE](file:///c:/Users/Nitya/.gemini/antigravity/scratch/resume_analyser/LICENSE) for more information.
