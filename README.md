# 🔥 Phoenix — Crisis Recovery Agent

> **Deadline Trauma Operations Center**  
> 4 AI agents. One coordinated rescue. Built for the moments when everything is on fire.

**Live Demo:** https://phoenix-647479600848.us-west1.run.app

---

## What is Phoenix?

Phoenix is an AI-powered deadline crisis recovery tool. When you're hours away from a submission with too much left to build, Phoenix triages your project, cuts what doesn't matter, and hands you a minute-by-minute rescue plan — so you ship something instead of nothing.

---

## How it Works

Phoenix runs a **4-agent Gemini AI pipeline**, each agent feeding the next:

```
User Input → Agent 1 → Agent 2 → Agent 3 → Agent 4 → Rescue Plan
```

| Agent | Name | What it does |
|---|---|---|
| 1 | **Crisis Diagnostics** | Reads your goal, hours, progress, and optionally a PDF spec. Classifies project type, scores 5 risk dimensions, identifies failure causes. |
| 2 | **Scope Optimizer** | Triages your feature list into Keep vs Cut. Calculates survival probability before and after triage. |
| 3 | **Rescue Planner** | Generates a concrete hour-by-hour execution plan using only the kept features. Every task is specific enough to start immediately. |
| 4 | **Outcome Simulator** | Simulates two parallel timelines — original plan vs Phoenix plan — showing exactly how each plays out. |

Plus two supporting agents:

| Agent | Name | What it does |
|---|---|---|
| 5 | **AI Crisis Coach** | Real-time motivational messages personalized to your goal, risk level, and progress. |
| 6 | **Team Notification** | Drafts a Slack or email update to your team explaining the delay and the rescue plan. |

---

## Features

- **PDF Spec Upload** — attach your assignment brief or project spec and Agent 1 extracts requirements automatically
- **Voice Input** — speak your goal and features using Web Speech API (Chrome/Edge)
- **Google Calendar Sync** — push every rescue block as a timed calendar event with color-coding and 2-min reminders
- **Live Execution Tracker** — check off blocks as you complete them, persisted via Firebase Firestore or localStorage fallback
- **Export & Share** — copy as Markdown, copy for Slack, or download as `.md` file
- **Session Persistence** — your rescue plan survives page refreshes (48-hour localStorage cache)
- **WebGL Ember Field** — Three.js particle background that responds to urgency level
- **Crisis Spine** — GSAP-animated connecting thread visualizing agent pipeline progress

---

## Tech Stack

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** for styling
- **Framer Motion** (`motion/react`) for animations
- **GSAP** + **Three.js** / **WebGL** for the Ember Field and Crisis Spine
- **Lucide React** for icons
- **Web Speech API** for voice input

### Backend
- **Express.js** server with TypeScript
- **Google Gemini API** (`gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.0-flash-lite` waterfall)
- **Groq API** (`llama-3.3-70b-versatile`) as fallback when Gemini rate-limits
- **LRU response cache** (50 entries, 30-min TTL) for demo resilience
- **Circuit breaker** — quota-blocked models skipped instantly, not retried

### Google Cloud & Firebase
- **Google Cloud Run** (via AI Studio) — production deployment
- **Firebase Firestore** — checklist persistence across sessions
- **Firebase Authentication** — anonymous auth for user sessions
- **Google Calendar API** — OAuth 2.0 event creation

---

## AI Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Input                          │
│  Goal · Hours · Progress · Features · PDF (optional)    │
└──────────────────────┬──────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │   Agent 1       │  gemini-2.5-flash
              │ Crisis Diagnose │  → project_type, risk_dimensions,
              │                 │    tech_stack, failure_causes
              └────────┬────────┘
                       │
         ┌─────────────▼──────────────┐
         │        Agent 2             │  gemini-2.5-flash
         │    Scope Optimizer         │  → keep[], cut[],
         │                            │    success_chance_before/after
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │        Agent 3             │  gemini-2.5-flash
         │    Rescue Planner          │  → hour-by-hour blocks[],
         │                            │    critical_path, buffer_hours
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │        Agent 4             │  gemini-2.5-flash
         │  Outcome Simulator         │  → timeline_a (failure),
         │                            │    timeline_b (success)
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   Supporting Agents        │
         │  Agent 5: Crisis Coach     │  On-demand motivation
         │  Agent 6: Team Notify      │  Slack/Email drafts
         └────────────────────────────┘
```

### Reliability Layer
```
gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite → Groq (llama-3.3-70b) → Heuristic fallback
```
Phoenix never shows a blank error — every agent has a heuristic fallback that kicks in if all AI providers are unavailable.

---

## Running Locally

### Prerequisites
- Node.js 20+
- Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### Setup

```bash
git clone https://github.com/anshu-c8NETed/phoenix.git
cd phoenix
npm install
```

Create a `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key          # optional fallback
SESSION_SECRET=any_random_string

# Google Calendar (optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback

# Firebase (optional — falls back to localStorage without these)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

```bash
npm run dev
```

App runs at `http://localhost:3000`

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/diagnose` | Agent 1 — project intelligence |
| POST | `/api/survival-version` | Agent 2 — feature triage |
| POST | `/api/rescue-plan` | Agent 3 — hour-by-hour plan |
| POST | `/api/simulate` | Agent 4 — outcome simulation |
| POST | `/api/motivate` | Agent 5 — crisis coaching |
| POST | `/api/team-notify` | Agent 6 — team notification draft |
| POST | `/api/triage-and-plan` | Agents 2+3 in parallel |
| GET | `/api/calendar/auth` | Google OAuth flow start |
| POST | `/api/calendar/events` | Create calendar events |
| GET | `/api/diag` | Diagnostics — AI key + quota status |
| DELETE | `/api/cache` | Flush LRU cache |

---

## Deployment

Deployed on **Google Cloud Run** via AI Studio.

```
https://phoenix-647479600848.us-west1.run.app
```

---

## Project Structure

```
phoenix/
├── src/
│   ├── App.tsx                 # Main app shell + agent orchestration
│   ├── LandingPage.tsx         # Hero with WebGL ember field
│   ├── AIMotivator.tsx         # Agent 5 — crisis coach UI
│   ├── CalendarSync.tsx        # Google Calendar OAuth + sync
│   ├── ChecklistTracker.tsx    # Live execution tracker
│   ├── CrisisSpine.tsx         # GSAP animated pipeline visualizer
│   ├── EmberField.ts           # Three.js WebGL particle system
│   ├── ExportPanel.tsx         # Markdown/Slack/download export
│   ├── Teamnotify.tsx          # Agent 6 — team notification UI
│   ├── VoiceInput.tsx          # Web Speech API mic input
│   ├── firebaseConfig.ts       # Firebase init with fallback
│   ├── sessionStore.ts         # localStorage session persistence
│   └── index.css               # Tailwind + custom animations
├── server.ts                   # Express server + all 6 agents
├── vite.config.ts
└── package.json
```

---

## Built With

- [Google Gemini API](https://ai.google.dev/) — primary AI backbone
- [Google Cloud Run](https://cloud.google.com/run) — deployment
- [Firebase](https://firebase.google.com/) — auth + database
- [Google Calendar API](https://developers.google.com/calendar) — event creation
- [Groq](https://groq.com/) — AI fallback (llama-3.3-70b-versatile)
- [Three.js](https://threejs.org/) — WebGL ember field
- [GSAP](https://gsap.com/) — Crisis Spine animation
- [Framer Motion](https://www.framer.com/motion/) — UI transitions
