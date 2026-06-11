# Bring Your Own Key (BYOK) Architecture & Security

Bluntly operates on a **Bring Your Own Key (BYOK)** model. This design choice sets it apart from traditional resume parsers by putting data privacy and API consumption limits directly under the candidate's control.

---

## 🔑 What is BYOK?
BYOK means you do not rely on centralized, paid server keys. Instead, you supply your own:
1. **Google Gemini API Key**: Used to process resume content and evaluate it against target job descriptions.
2. **GitHub Personal Access Token (PAT)**: Used to fetch your public portfolio metrics (repositories, star count, commits, languages) without running into GitHub's strict rate limits.

---

## 🔒 Security & Privacy Benefits

CS resumes contain sensitive Personal Identifiable Information (PII) like names, email addresses, phone numbers, and location addresses. Bluntly guarantees privacy through a multi-tier defense:

1. **Local PII Redaction**: Before sending any resume content to the AI backend, Bluntly runs a local script ([src/lib/pii.js](../src/lib/pii.js)) inside your client browser environment. This script scrubs all phone numbers, email addresses, exact locations, and web profile links.
2. **Local Storage Key Persistence**: When you save your API keys in the Settings Panel, they are saved directly in your browser's `localStorage`. They are never stored in our backend databases or logs.
3. **Transmission Security**: The keys are sent as request headers (`x-api-key`) over HTTPS directly to the Next.js API endpoints. These endpoints use the key on-the-fly to query Google's Gemini API and then discard the key from memory immediately after the request completes.

---

## 🏗️ Architecture & Data Flow

Below is a diagram showing how data, API keys, and redactions flow through Bluntly's systems:

```mermaid
graph TD
    classDef client fill:#f9f0ff,stroke:#8b5cf6,stroke-width:2px;
    classDef server fill:#f3f4f6,stroke:#4b5563,stroke-width:2px;
    classDef external fill:#fff7ed,stroke:#ea580c,stroke-width:2px;

    User[User Uploads Resume & Job Description] ::: client
    LocalStore[Browser LocalStorage <br/> Stores Gemini API Key & GitHub PAT] ::: client
    LocalPII[Local Redaction Engine <br/> src/lib/pii.js] ::: client
    BluntlyAPI[Next.js Server API <br/> /api/analyse or /api/batch] ::: server
    GeminiAPI[Google Gemini API <br/> 1.5 Flash] ::: external
    GitHubAPI[GitHub GraphQL API] ::: external

    User --> LocalPII
    LocalPII -->|1. Sends Scrubbed Resume Content| BluntlyAPI
    LocalStore -->|2. Appends Keys in Headers| BluntlyAPI
    
    BluntlyAPI -->|3. Requests AI Parsing with User Key| GeminiAPI
    BluntlyAPI -->|4. Requests Portfolio Data with User PAT| GitHubAPI
    
    GeminiAPI -->|5. Returns Raw Evaluation JSON| BluntlyAPI
    GitHubAPI -->|6. Returns Repositories & Activity| BluntlyAPI
    
    BluntlyAPI -->|7. Computes Score & Renders Heuristics| User
```

---

## 🛠️ Step-by-Step Setup Guide

### 1. Get your Google Gemini API Key
To use the AI parser, you need a free/pay-as-you-go Gemini API key:
1. Go to the [Google AI Studio](https://aistudio.google.com/).
2. Log in with your Google account.
3. Click **Create API Key**.
4. Copy the key.

### 2. Get your GitHub Personal Access Token (Optional)
To integrate repository activity scores:
1. Go to your GitHub profile settings.
2. Navigate to **Developer Settings** → **Personal Access Tokens** → **Tokens (classic)**.
3. Click **Generate new token (classic)**.
4. Set the scope to `public_repo` (or leave empty if you only want to read completely public metrics).
5. Copy the generated token.

### 3. Configure Bluntly

#### Client-Only Storage (Recommended for Individuals)
1. Launch the Bluntly dashboard locally (`npm run dev`).
2. Click the **Settings** icon in the sidebar.
3. Paste your **Gemini API Key** and **GitHub Access Token** in the input fields.
4. Click **Save Settings**.
5. All future analysis scans will run using these credentials.

#### Server-Side Deployment (Recommended for Shared Teams)
If deploying Bluntly as a team service, you can hardcode keys in your hosting server's environment variables (e.g. Vercel, Supabase):
1. In your `.env.local` or environment config, define:
   ```env
   GEMINI_API_KEY=your_gemini_key
   GITHUB_PAT=your_github_token
   ```
2. When users upload resumes, the application will default to these server keys. Users can still override them by pasting their own in their browser settings.
