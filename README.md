<p align="center">
  <img src="https://img.shields.io/badge/Google%20Cloud-Run-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini-2.5%20Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
</p>

<h1 align="center">🔥 Phoenix — Crisis Recovery Agent</h1>

<p align="center"><em>When planning is already impossible, Phoenix finds the version that survives.</em></p>

<p align="center">
  <strong><a href="https://phoenix-647479600848.us-west1.run.app">🚀 Live Demo</a></strong>
</p>

---

## The Problem

Imagine this.

> Assignment due in **6 hours.**  
> Hackathon submission **tonight.**  
> Half the features **unfinished.**  
> Team is **panicking.**

Traditional productivity apps assume you still have time to plan.

**Phoenix is built for the moment planning has already failed.**

Instead of helping you do *everything* — Phoenix figures out what to **stop building.**  
It rescues the smallest possible version that can still succeed.

---

## Why Phoenix Exists

Every year, millions of students, developers, and teams miss deadlines — not because they aren't capable — but because they keep executing **impossible plans.**

Phoenix acts like an **emergency incident commander.**

Instead of asking *"How do I finish everything?"*  
it asks *"What is the smallest version that still wins?"*

---

## Highlights

- 🤖 **6 specialized AI agents** powered by Google Gemini
- 🧠 **Multi-agent reasoning pipeline** — each agent feeds the next
- 🔁 **Self-correcting plan loop** — Agent 4 simulates the first-pass plan; if it's too risky, triage automatically re-runs at stricter cuts
- ☁️ **Google Cloud Run** deployment via AI Studio
- 🔥 **Firebase** Firestore persistence + Authentication
- 📄 **PDF spec understanding** — upload your brief, Gemini extracts requirements
- 🎙️ **Voice input** via Web Speech API
- 📅 **Google Calendar integration** — rescue blocks become timed events
- ⚡ **AI provider failover** — never shows a blank screen
- 🌐 **Three.js WebGL** ember field interface + GSAP Crisis Spine
- 🎨 **Glass-panel design system** — consistent premium UI across landing and app
- 💾 **Offline fallback** — works even without Firebase

---

## Example

**Input:**
| Field | Value |
|---|---|
| Goal | Hackathon web app |
| Time Left | 7 hours |
| Progress | 30% |
| Features | Auth, AI Chat, Dashboard, Analytics, Payments, Landing Page |

**Phoenix says:**

✅ **KEEP** — Landing Page, Authentication, AI Chat  
✕ **CUT** — Analytics, Payments, Dashboard

📈 **Survival probability: 18% → 81%**

⏱️ **Rescue plan:**
- Hour 1–2: Build landing page and auth flow, skip form validation
- Hour 3–4: Wire AI Chat to Gemini API, hardcode responses for edge cases
- Hour 5–6: Integration smoke test, deploy to Cloud Run
- Hour 7: Record 60s demo video as backup, submit

---

## The 6-Agent Pipeline

```
User Input
    │
    ▼
┌─────────────────────┐
│  Agent 1            │  Diagnose the crisis
│  Crisis Diagnostics │  → project type, risk score, failure causes
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Agent 2            │  Cut ruthlessly
│  Survival Version   │  → keep[], cut[], survival probability
│  Generator          │
└──────────┬──────────┘
           │ (runs in parallel with Agent 3)
           ▼
┌─────────────────────┐
│  Agent 3            │  Plan precisely
│  Rescue Planner     │  → hour-by-hour blocks, critical path
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Agent 4            │  See both futures
│  Parallel Futures   │  → timeline A (failure) vs B (success)
│  + Self-Correction  │  → if odds dip below threshold, re-runs
│                     │     Agent 2+3 once at stricter cuts
└──────────┬──────────┘
           │
           ▼
┌───────────────────────────────────────┐
│  Agent 5: Crisis Coach                │  On-demand motivation
│  Agent 6: Team Notification           │  Slack/Email drafts
└───────────────────────────────────────┘
           │
           ▼
Calendar Sync · Live Tracker · Export · Share
```

**Self-correction loop:** Agents 2 and 3 fire together behind a single `/api/triage-and-plan` call. Their output is immediately run through Agent 4's simulator — if the implied success odds land below 60%, or Phoenix's own "winning" timeline still simulates a failure beat, triage automatically retries once at high strictness, fed the specific risks the simulation surfaced. The retry is only kept if it actually improves on the first attempt, so a stubbornly risky goal can't loop or regress.

---

## Why AI?

Phoenix **cannot be implemented using rules alone.**

Every rescue plan depends on:
- Project complexity and tech stack
- Remaining time vs estimated work
- Current progress percentage
- Uploaded specification or rubric
- Feature dependencies and demo requirements
- Probability of successful completion under pressure

Each project produces a **completely different rescue strategy.**  
Gemini reasons over all of these variables to produce a unique execution plan — rather than following a fixed template.

---

## Why Multiple Agents?

Instead of one giant prompt, Phoenix separates reasoning into **specialized AI agents.**  
Each agent performs a single task before passing structured output to the next.

**Benefits:**
- Better reasoning — each agent has a focused, expert-level system prompt
- Lower hallucination — smaller, constrained output schemas per agent
- Explainable decisions — users see each agent's reasoning
- Reusable components — agents can be called independently
- Easier debugging — failures are isolated to one agent
- Self-correcting — Agent 4's simulation can trigger a stricter automatic retry of Agents 2+3

---

## Features

### 🧠 AI Agent Pipeline
- **Agent 1 — Crisis Diagnostics:** Classifies project type (software/research/pitch/exam/etc.), scores 5 risk dimensions (Time, Scope, Complexity, Dependency, Execution), identifies top failure causes
- **Agent 2 — Survival Version Generator:** Triages feature list into Keep vs Cut with confidence scores and implementation shortcuts for each kept feature
- **Agent 3 — Rescue Planner:** Hour-by-hour execution blocks with risk tags (critical path / high risk / normal / buffer), specific enough to start immediately
- **Agent 4 — Parallel Futures:** Simulates two timelines — original plan leading to failure vs Phoenix plan leading to success — with real narrative events, and triggers an automatic stricter re-triage if the Phoenix timeline itself simulates poorly
- **Agent 5 — Crisis Coach:** Personalized motivation referencing your actual goal, hours, and odds. No hollow clichés.
- **Agent 6 — Team Notification:** Drafts a Slack message or professional email explaining the delay and rescue plan to teammates

### 📄 PDF Spec Upload
Attach your assignment brief, project spec, or rubric — Gemini reads it and extracts requirements, constraints, and grading criteria automatically.

### 🎙️ Voice Input
Speak your goal and features using the Web Speech API. Works natively in Chrome and Edge — no API key needed.

### 📅 Google Calendar Sync
Push every rescue block as a timed Google Calendar event — color-coded by task type, with 2-minute popup reminders.

### ✅ Live Execution Tracker
Check off blocks as you complete them. Progress persists via Firebase Firestore (with localStorage fallback). Includes a completion celebration.

### 📤 Export & Share
- Copy as Markdown (Notion/Obsidian ready)
- Copy for Slack/Teams
- Download as `.md` file

### 💾 Session Persistence
Your rescue plan survives page refreshes. 48-hour cache via localStorage.

### 🎨 Glass Design System
A shared glass/blur visual language (`.phoenix-card`, `.widget-panel`, `.glass-tile`, etc., defined in `index.css`) runs through the landing page, the main app shell, and every agent widget — so the premium look isn't limited to the hero.

---

## Reliability

Phoenix **never returns a blank screen** — even if every AI provider becomes unavailable.

```
Gemini 2.5 Flash  (+ optional 2nd key for burst capacity)
      ↓
Gemini 2.0 Flash
      ↓
Gemini 2.0 Flash Lite
      ↓
Groq (llama-3.3-70b-versatile)
      ↓
Heuristic Engine
      ↓
   Never Fail
```

Additional resilience features:
- **Circuit breaker** — a 429 blocks a model for 90s, a 503 for 20s; blocked models are skipped instantly rather than retried and timed out
- **LRU response cache** (50 entries, 30-min TTL) — repeated demo runs return sub-10ms cached responses; `DELETE /api/cache` flushes it before a fresh run
- **Two Gemini API keys** supported (`GEMINI_API_KEY`, `GEMINI_API_KEY_2`) for burst capacity — both are tried on every model tier before falling through to the next
- **`GET /api/diag`** — shows live per-model quota/block status, useful for judges or debugging mid-demo

---

## Tech Stack

### Frontend
- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS v4**
- **Framer Motion** for UI transitions
- **GSAP** + **Three.js / WebGL** — ember field particle system and Crisis Spine animation
- **Lucide React** for icons

### Backend
- **Express.js** + **TypeScript** (compiled via esbuild)
- **Google Gemini API** — every major AI decision. Groq exists only as a resilience fallback.
- **Groq API** (`llama-3.3-70b-versatile`) — fallback only
- Structured JSON output via Gemini's `responseSchema` for type-safe agent responses

### Google Cloud & Firebase
- **Google Cloud Run** — production deployment (via AI Studio)
- **Firebase Firestore** — checklist persistence
- **Firebase Authentication** — Google sign-in for cross-device session sync, with anonymous/local fallback
- **Google Calendar API** — OAuth 2.0 event creation with per-type color coding

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Client (React 19)              │
│  Landing → Form → Agent Cards → Results     │
│  Three.js WebGL · GSAP · Framer Motion      │
└──────────────────┬──────────────────────────┘
                   │ HTTP/JSON
┌──────────────────▼──────────────────────────┐
│           Express Server (Node 20)          │
│                                             │
│  /api/diagnose         → Agent 1            │
│  /api/survival-version → Agent 2            │
│  /api/rescue-plan      → Agent 3            │
│  /api/triage-and-plan  → Agents 2+3 + self- │
│                          correction (Agent 4)│
│  /api/simulate         → Agent 4            │
│  /api/motivate         → Agent 5            │
│  /api/team-notify      → Agent 6            │
│  /api/calendar/*       → Google Calendar    │
│  /api/diag, /api/cache → diagnostics        │
│                                             │
│  LRU Cache · Circuit Breaker · Fallbacks    │
└──────────────────┬──────────────────────────┘
                   │
      ┌────────────┼────────────┐
      ▼            ▼            ▼
  Gemini API   Groq API    Firebase
  (primary)   (fallback)  Firestore
```

---

## Running Locally

```bash
git clone https://github.com/anshu-c8NETed/phoenix.git
cd phoenix
npm install
```

Create `.env`:
```env
GEMINI_API_KEY=your_key_here
GEMINI_API_KEY_2=your_second_key_here  # optional — burst capacity
GROQ_API_KEY=your_key_here             # optional
SESSION_SECRET=any_random_string

# Google Calendar (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback

# Firebase (optional — falls back to localStorage)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> **Note:** Firebase Authentication's "Sign in to sync" requires the app's domain to be listed under **Firebase Console → Authentication → Settings → Authorized domains**. `localhost` is whitelisted automatically; any other deploy/preview domain needs to be added manually, or sign-in will fail with `auth/unauthorized-domain`.

```bash
npm run dev
# → http://localhost:3000
```

---

## Project Structure

```
phoenix/
├── src/
│   ├── App.tsx                 # Agent orchestration + state
│   ├── LandingPage.tsx         # Hero with WebGL ember field
│   ├── DesignSystem.tsx        # Shared glass/gradient design tokens + primitives
│   ├── SimulationViz.tsx       # Agent 4 WebGL diverging-timeline centerpiece
│   ├── CrisisSpine.tsx         # GSAP pipeline-connector visualizer
│   ├── AIMotivator.tsx         # Agent 5 UI
│   ├── CalendarSync.tsx        # Google Calendar OAuth + sync
│   ├── ChecklistTracker.tsx    # Live execution tracker
│   ├── EmberField.ts           # Three.js WebGL particles
│   ├── EmberFieldBackdrop.tsx  # Three.js WebGL particles
│   ├── ExportPanel.tsx         # Export UI
│   ├── Teamnotify.tsx          # Agent 6 UI
│   ├── VoiceInput.tsx          # Web Speech API
│   ├── firebaseConfig.ts       # Firebase init + fallback
│   ├── sessionStore.ts         # Session persistence
│   └── index.css               # Tailwind v4 theme + glass design system
│   ├── Footer.tsx              # Footer with nav links(github and portfolio)
├── server.ts                   # Express + all 6 agents
└── package.json
```

---

## Deployment

Live on **Google Cloud Run** via AI Studio:

```
https://phoenix-647479600848.us-west1.run.app
```

---

## Roadmap

- [ ] GitHub integration — analyze your actual codebase
- [ ] Jira / Linear import — read existing tickets
- [ ] Figma parsing — understand design completion state
- [ ] Automatic progress detection from git commits
- [ ] Team-wide rescue planning with role assignment

---

## Built With

- [Google Gemini API](https://ai.google.dev/) — primary AI backbone
- [Google Cloud Run](https://cloud.google.com/run) — deployment
- [Google AI Studio](https://aistudio.google.com/) — build + publish
- [Firebase](https://firebase.google.com/) — auth + database
- [Google Calendar API](https://developers.google.com/calendar) — event creation
- [Groq](https://groq.com/) — resilience fallback
- [Three.js](https://threejs.org/) — WebGL ember field
- [GSAP](https://gsap.com/) — Crisis Spine animation
- [Framer Motion](https://www.framer.com/motion/) — UI transitions

---

<p align="center">
  <em>Built for the moments when everything is on fire. 🔥</em>
</p>
