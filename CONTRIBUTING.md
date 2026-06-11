# Contributing to Bluntly ⚡

We are thrilled that you are looking to contribute to Bluntly! As a project built for CS students, we want the onboarding experience for developers to be as welcoming, transparent, and low-friction as possible.

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**

### Step-by-Step Installation
1. **Fork the Repository**: Fork Bluntly to your own GitHub account.
2. **Clone the Repo**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/bluntly.git
   cd bluntly
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Environment Variables**:
   By default, Bluntly works in **Local Dev Mode** using your browser's local storage to save keys. No server configurations are required.
   If you wish to test Supabase database integration:
   - Create a free project on [Supabase](https://supabase.com/).
   - Copy `.env.example` to `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - Input your Supabase credentials and optional global Gemini API key.
5. **Database Migration**:
   If using Supabase, run the SQL migrations in your Supabase SQL Editor:
   - Run [schema.sql](schema.sql) to create the scans tracking table.
   - Run [schema_credits.sql](schema_credits.sql) to set up profile credits.
6. **Start the Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 💻 Coding Standards

To maintain code readability and reliability, please adhere to these standards:

### 1. React & Next.js Patterns
- Use **functional components** and standard React Hooks (`useState`, `useEffect`, `useMemo`).
- Keep Client Components isolated using `"use client"` directive at the top of files when browser APIs (`localStorage`, event streaming, etc.) are needed.
- Place reusable components in `src/components/` and utility libraries in `src/lib/`.

### 2. Styling (Vanilla CSS)
- Avoid adding inline styles.
- Define layout tokens, grid behaviors, and colors inside [src/app/globals.css](src/app/globals.css).
- Ensure styling maintains the premium SaaS aesthetic: glassmorphism, dynamic transitions, polka-dot backgrounds, and dark/light compatibility.

### 3. Linting
Run the linter before submitting commits:
```bash
npm run lint
```

---

## 🐙 Pull Request Guidelines

### 1. Branch Naming
Create descriptive branches named according to the following conventions:
- `feat/your-feature-name` for new enhancements.
- `fix/bug-fix-name` for issues.
- `docs/documentation-update` for edits to docs.

### 2. Commits
- Write clear, concise commit messages in the present tense (e.g. `feat: add markdown analysis parser`).
- Keep commits focused on a single change.

### 3. Submission Flow
1. Push your branch to your forked repository.
2. Open a Pull Request from your fork against Bluntly's `main` branch.
3. Complete the Pull Request template describing the issue resolved, architectural changes, and manual verification steps.
4. Ensure the GitHub Actions CI build passes.
5. A maintainer will review your code shortly!

---

## 🐛 Issues & Bug Reports
Found a bug or have a suggestion?
- Check the issues board first to ensure it hasn't already been reported.
- If not, create a new issue using our **Bug Report** or **Feature Request** templates. Provide system information, console screenshots, and steps to reproduce.
