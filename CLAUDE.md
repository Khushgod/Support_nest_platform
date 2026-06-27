# Support Nest Hiring OS — CLAUDE.md

**Project:** Support Nest — B2B2C hiring platform for neurodivergent talent  
**Stack:** Next.js (React) + Node + SQLite + Llama 3.3 via open-source client  
**Status:** Early-stage MVP (7-phase build)  
**Last updated:** June 2026  

---

## Product Overview

Support Nest is a hiring operating system that removes friction in recruiting neurodivergent talent (autistic + ADHD) for corporates. The platform sits between corporate DEI/HR teams and neurodivergent candidates, solving:

1. **Diagnostic-to-strengths translation** (genetranslate) — Parses verified diagnostic reports, extracts neurodiversity profile, informs role matching
2. **Skill-true assessment** — Custom assessments designed by ND experts that test ability, not neurotypical assumptions
3. **Role-based workflows** — Three distinct user journeys (Program Manager, Talent Acquisition, Employee/HR) with strict access control
4. **Retention + support** — Allyship training for managers, upskilling for new hires, ongoing coaching

### Core value prop
- **For corporates:** Access to high-quality, under-tapped talent + lower hiring risk + measurable retention
- **For ND talent:** Fair hiring process + real skill assessment + community + support after hire

---

## System Architecture

### Tech Stack
| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js (React 18+) + Tailwind CSS | Type-safe, server components, great DX |
| **Backend** | Next.js API routes (Node.js) | Single language, minimal ops |
| **Database** | SQLite (local dev / early prod) | Lightweight, zero setup, perfect for MVP |
| **Auth** | Supabase Auth or Clerk (optional) | If not, hand-roll with JWT + hashed passwords |
| **LLM** | Llama 3.3 via open-source client | genetranslate parsing (Ollama / Together.ai / local vLLM) |
| **File storage** | Local `./uploads` directory (dev) | Upgrade to S3-like storage in production |
| **Hosting** | Vercel + SQLite dump backups | Or self-host if preferred |

### Key Design Constraints

**1. Dark theme only (MVP)**
- All components use CSS variables for light/dark mode support
- CSS variables defined in `app/styles/theme.css`
- Color palette (from prototype):
  - `--bg: #0E1018` (page background)
  - `--surface-1: #171A26` (cards)
  - `--surface-2: #1E2230` (elevated)
  - `--text: #EDEEF2` (primary text)
  - `--text-2: #A4A9BC` (secondary)
  - `--text-3: #6E7488` (muted)
  - `--violet: #7C8CF8` (active/primary action)
  - `--teal: #4FD1C5` (success/match signals)
  - `--amber: #F5B84E` (in-progress/attention)
  - `--rose: #F08A8A` (warning, never harsh red)
  - `--green: #5DD39E` (retention/success)

**2. Database is SQLite, not Postgres**
- Store at `./data/supportnest.db`
- Use `better-sqlite3` for sync queries or `sqlite3` for async
- Schema: `schema.sql` at project root
- Migrations: use simple `.sql` files in `./migrations`, executed in order at startup

**3. No external LLM calls for core product logic**
- genetranslate file (already exists, referenced as `./lib/genetranslate.js`) handles diagnostic parsing
- Only call Llama 3.3 for: assessment generation (optional enhancements), course content expansion
- Keep Llama calls to a minimum; prefer deterministic logic

**4. Medical data is sensitive; treat accordingly**
- Diagnostic reports are encrypted at rest (use `crypto` module)
- Never log personally identifiable info (PII)
- Deletion must be hard-delete (no soft-delete only)
- Access logs (who viewed what, when) should be kept for audit
- No diagnostic data sent to external APIs without explicit consent
- Assume DPDP Act compliance (India): user consent, purpose limitation, storage minimization

**5. File uploads are for reports + résumés only**
- Max 5MB per file
- Allowed types: PDF, DOCX (via `pdf-parse` + `docx` libraries)
- Store in `./uploads/{organizationId}/{candidateId}/` with UUID filenames
- Provide delete endpoint (user can delete their own uploads)

**6. User roles have hard boundaries**
- Role assignments are in database, checked on every request
- No role spillover: a recruiter cannot access budget data, a CHRO cannot shortlist candidates
- Routes are protected with middleware (see auth section below)

---

## Data Model

```
Organizations
├── id (UUID, primary key)
├── name (string)
├── created_at (timestamp)

Users
├── id (UUID, primary key)
├── organization_id (FK → Organizations)
├── email (string, unique within org)
├── password_hash (string, bcrypt)
├── role (enum: 'program_manager' | 'talent_acquisition' | 'employee_hr')
├── full_name (string)
├── created_at (timestamp)

Requisitions
├── id (UUID, primary key)
├── organization_id (FK → Organizations)
├── title (string, e.g. "Data Analyst")
├── team (string, e.g. "Growth")
├── description (text)
├── status (enum: 'open' | 'closed' | 'on_hold')
├── created_by (FK → Users, program_manager)
├── created_at (timestamp)

Candidates
├── id (UUID, primary key)
├── organization_id (FK → Organizations)
├── first_name (string)
├── last_name (string)
├── email (string)
├── neurodivergence (enum: 'autistic' | 'adhd' | 'both' | 'other')
├── years_experience (integer)
├── status (enum: 'applied' | 'matched' | 'assessing' | 'interviewing' | 'offered' | 'rejected')
├── created_at (timestamp)

DiagnosticReports
├── id (UUID, primary key)
├── candidate_id (FK → Candidates)
├── file_path (string, encrypted filename)
├── file_hash (string, SHA256 for deduplication)
├── parsed_profile (JSON, output from genetranslate)
├── uploaded_at (timestamp)
├── deleted_at (timestamp, NULL = not deleted, for hard-delete audit)

MatchScores
├── id (UUID, primary key)
├── candidate_id (FK → Candidates)
├── requisition_id (FK → Requisitions)
├── resume_fit_score (float 0–100)
├── neurodiversity_fit_score (float 0–100)
├── combined_score (float 0–100, weighted average)
├── reasoning (text, brief explanation)
├── calculated_at (timestamp)

SkillAssessments
├── id (UUID, primary key)
├── requisition_id (FK → Requisitions)
├── role_title (string)
├── assessment_json (JSON, the assessment definition)
├── created_by (FK → Users, program_manager)
├── created_at (timestamp)

CandidateAssessmentResults
├── id (UUID, primary key)
├── candidate_id (FK → Candidates)
├── assessment_id (FK → SkillAssessments)
├── answers (JSON, candidate's responses)
├── score (float 0–100)
├── completed_at (timestamp)

InterviewPrepModules
├── id (UUID, primary key)
├── candidate_id (FK → Candidates)
├── requisition_id (FK → Requisitions)
├── module_step (enum: 'what_to_expect' | 'practice_round' | 'request_accommodations')
├── completed (boolean)
├── completed_at (timestamp, NULL = not done)

AllyshipModules
├── id (UUID, primary key)
├── organization_id (FK → Organizations)
├── slug (string, e.g. "foundations" | "communication" | "accommodation" | "feedback" | "certification")
├── title (string)
├── description (text)
├── duration_minutes (integer)
├── order (integer, 1–5)
├── content_html (text, or reference to video URL)

UserAllyshipProgress
├── id (UUID, primary key)
├── user_id (FK → Users)
├── module_id (FK → AllyshipModules)
├── started_at (timestamp)
├── completed_at (timestamp, NULL = in progress)
├── score (float 0–100, NULL = not yet taken cert)

HiringPhases
├── candidate_id (FK → Candidates)
├── requisition_id (FK → Requisitions)
├── phase_name (enum: 'apply' | 'match' | 'assess' | 'interview' | 'onboard' | 'thrive')
├── entered_at (timestamp)
├── exited_at (timestamp, NULL = current phase)

AuditLogs
├── id (UUID, primary key)
├── user_id (FK → Users)
├── action (string, e.g. "viewed_diagnostic_report", "downloaded_resume", "set_match_score")
├── resource_type (string, e.g. "DiagnosticReports", "MatchScores")
├── resource_id (UUID)
├── timestamp (timestamp)
```

**Notes:**
- All timestamps are UTC
- All IDs are UUIDs (use `crypto.randomUUID()` in Node)
- Sensitive fields (passwords, diagnostic data) are never logged
- Soft deletes: use `deleted_at` for audit; hard deletes remove rows entirely

---

## Three User Roles & Access

### 1. Program Manager (DEI Head / CHRO)
**Can see/do:**
- Full dashboard: all metrics, all phases, all requisitions, all stakeholders
- Create + manage requisitions
- View all candidates and their phase progress
- View match scores (aggregated, not individual diagnostic details unless explicitly shown)
- View team health metrics: conversion rates, retention, cost-per-hire
- View Inclusion ROI (budget spend vs. outcomes)
- Manage stakeholders (add users to org)
- View but cannot edit allyship training (that's HR)

**Cannot see:**
- Individual diagnostic reports (they don't need to; they see aggregate strengths)
- Detailed interview results (that's TA/HR)
- Candidate personal accommodations (privacy)

**Routes:**
- `/dashboard` — overview
- `/requisitions` — all open reqs
- `/candidates` — pipeline view
- `/stakeholders` — team management
- `/roi` — budget + outcomes

### 2. Talent Acquisition (Recruiter)
**Can see/do:**
- genetranslate panel: upload reports, see parsed profile
- Candidate shortlist for assigned requisition
- Curated skill assessments (browse library, create custom ones)
- Run assessments (assign to candidate)
- View assessment results
- Interview prep module: see if candidate completed it
- Candidate notes + communication log
- Cannot see budget / ROI data

**Cannot see:**
- Other requisitions (only ones assigned to them)
- Allyship training dashboard
- Diagnostic reports (only parsed profile)

**Routes:**
- `/pipeline` — candidates + shortlist
- `/genetranslate` — upload diagnostic + résumé
- `/assessments` — view/create/assign
- `/interview-prep` — track candidate progress

### 3. Employee / HR (Manager or HR Business Partner)
**Can see/do:**
- Their own allyship training progress
- Allyship module library
- When they have a new ND hire: a personalized brief ("Working with [name]")
- Cannot see candidate data, budget, hiring details

**Cannot see:**
- Candidates
- Requisitions
- Other people's training (privacy)

**Routes:**
- `/allyship` — their training dashboard
- `/modules` — module library
- `/certificates` — their certifications
- `/my-team` — upcoming ND hires (if role is manager)

---

## Authentication & Authorization

### How it works
1. User signs up / logs in with email + password
2. Password hashed with bcrypt (rounds: 10)
3. On login: create JWT token, store in httpOnly cookie
4. Every request: verify token middleware, extract user.id and user.role
5. Protected routes check role against allowed roles

### Login flow
- Single unified login page
- Email + password
- On success: JWT token, redirect to `/dashboard` (or role-specific home)
- On failure: "Invalid email or password" (never reveal which)

### Middleware
```javascript
// lib/middleware/auth.ts
export async function authenticateUser(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded; // { id, email, role, organization_id }
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

### Environment variables
```
DATABASE_URL=./data/supportnest.db
JWT_SECRET=<random-64-char-string>
LLAMA_API_URL=http://localhost:11434  # if using Ollama locally
LLAMA_API_KEY=<if-using-together-ai-or-huggingface>
ENCRYPTION_KEY=<random-32-char-string-for-file-encryption>
NODE_ENV=development
```

---

## genetranslate Integration

**You already have this file.** Import and use it:

```javascript
// lib/genetranslate.js (your existing file)
export async function parseReport(reportPath) {
  // Input: path to PDF/DOCX diagnostic report
  // Output: { neurodivergence, traits, strengths, accommodations, workStyleProfile }
  // This file handles the parsing logic — Claude Code should NOT rewrite it
}
```

**In the code:**
```javascript
import { parseReport } from '@/lib/genetranslate';

// When TA uploads a report:
const parsed = await parseReport(uploadedFilePath);
await db.insert('DiagnosticReports').values({
  candidate_id,
  file_path: encryptedPath,
  parsed_profile: parsed,
});
```

**Do NOT:**
- Try to rebuild genetranslate
- Call it via LLM every time (it's deterministic)
- Store the raw report in memory

---

## Database Initialization

**File:** `schema.sql` (at project root)

On first run:
```javascript
// lib/db.ts
import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('./data/supportnest.db');

// Run migrations on startup
const schema = fs.readFileSync('./schema.sql', 'utf-8');
db.exec(schema);
```

**Do NOT:**
- Use an ORM yet (keep it simple; raw SQL or simple query builder)
- Use Prisma (adds complexity for MVP)
- Use Sequelize (overkill)

---

## API Endpoints (Reference)

**Auth:**
- `POST /api/auth/register` — sign up
- `POST /api/auth/login` — sign in
- `POST /api/auth/logout` — sign out

**Candidates:**
- `GET /api/candidates` — list (requires role check)
- `POST /api/candidates` — create new
- `GET /api/candidates/:id` — detail
- `PUT /api/candidates/:id` — update status/phase

**Diagnostic Reports:**
- `POST /api/reports/upload` — upload PDF/DOCX, call genetranslate
- `GET /api/reports/:candidateId` — view parsed profile (role-gated)
- `DELETE /api/reports/:id` — hard delete

**Match Scores:**
- `POST /api/matches/calculate` — run matching algorithm
- `GET /api/matches/:candidateId/:requisitionId` — view score

**Assessments:**
- `GET /api/assessments` — list available
- `POST /api/assessments` — create new (program_manager only)
- `POST /api/assessments/:id/assign` — assign to candidate
- `POST /api/assessments/:id/submit` — candidate submits answers
- `GET /api/assessments/:id/results` — view results (role-gated)

**Allyship:**
- `GET /api/allyship/modules` — list all
- `GET /api/allyship/progress/:userId` — user's progress
- `POST /api/allyship/modules/:id/complete` — mark complete

---

## Coding Conventions

### File structure
```
supportnest/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── login.ts
│   │   ├── candidates/
│   │   ├── reports/
│   │   ├── matches/
│   │   ├── assessments/
│   │   └── allyship/
│   ├── (marketing)/ — landing page (optional for MVP)
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── pipeline/
│   ├── allyship/
│   ├── layout.tsx (root)
│   └── page.tsx (login or home)
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── PhaseTracker.tsx
│   │   ├── MetricCard.tsx
│   │   └── ... (others)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   └── features/
│       ├── GenetranslatePanel.tsx
│       ├── CandidateShortlist.tsx
│       └── ...
├── lib/
│   ├── db.ts (database client)
│   ├── genetranslate.js (your existing file — import only)
│   ├── matching.ts (scoring algorithm)
│   ├── middleware/
│   │   └── auth.ts
│   ├── utils.ts (helpers)
│   └── validators.ts (input validation)
├── styles/
│   ├── globals.css (Tailwind + theme variables)
│   └── theme.css (--color- variables)
├── public/
│   └── (static assets)
├── data/
│   └── supportnest.db (SQLite, created at runtime)
├── migrations/
│   └── 001-init.sql
├── schema.sql (full schema, run once)
├── CLAUDE.md (this file)
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.local (local only, never commit)
```

### Naming
- **Components:** PascalCase (Button, PhaseTracker)
- **Functions:** camelCase (parseReport, calculateMatch)
- **Variables:** camelCase (candidateId, matchScore)
- **Types:** PascalCase (User, MatchScore, RequisitionStatus)
- **Routes:** kebab-case (/api/candidates, /dashboard/pipeline)
- **Database columns:** snake_case (user_id, created_at, parsed_profile)

### Imports
```typescript
// Prefer absolute imports
import { Card } from '@/components/ui/Card';
import { parseReport } from '@/lib/genetranslate';

// Not relative imports (except within same directory)
// import Card from '../../../components/ui/Card';
```

### Error handling
```typescript
// Always return structured errors
try {
  const result = await db.query(...);
  return { success: true, data: result };
} catch (error) {
  console.error('Error:', error.message); // Never log sensitive data
  return { success: false, error: 'Something went wrong' };
}
```

### Async/await (never callbacks)
```typescript
// Good
async function fetchCandidates(orgId) {
  const candidates = await db.all('SELECT * FROM Candidates WHERE organization_id = ?', [orgId]);
  return candidates;
}

// Bad
db.all('SELECT...', (err, rows) => { ... });
```

---

## Testing & Validation

### Manual testing endpoints
Use a tool like **Postman** or **curl**:
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Get candidates
curl -X GET http://localhost:3000/api/candidates \
  -H "Cookie: token=<JWT_TOKEN_HERE>"
```

### Database seeding (for dev)
Create `scripts/seed.ts` to populate test data:
```typescript
import { seedOrganizations, seedUsers, seedCandidates } from '@/lib/seed';

async function main() {
  await seedOrganizations();
  await seedUsers();
  await seedCandidates();
  console.log('✓ Database seeded');
}

main();
```

Run with:
```bash
npx ts-node scripts/seed.ts
```

---

## Deployment Notes

### Before production
- [ ] Switch database to managed Postgres (Supabase, Neon) or managed SQLite (Turso)
- [ ] Add encryption for diagnostic reports (use `crypto` AES-256)
- [ ] Set up audit logging (all access to sensitive data)
- [ ] Enable HTTPS (Vercel does this by default)
- [ ] Set CORS headers (only allow your frontend domain)
- [ ] Rate-limit API endpoints (protect against brute force)
- [ ] Backup strategy for the database
- [ ] Privacy policy + terms (required for medical data)
- [ ] DPDP Act compliance review (India)

### Environment
```
Production:
  NODE_ENV=production
  DATABASE_URL=<managed-postgres-or-turso>
  JWT_SECRET=<strong-random>
  ENCRYPTION_KEY=<strong-random>
  Verify: all secrets in Vercel Environment Variables (not in .env.local)
```

---

## Known constraints & TODOs

1. **SQLite in production:** SQLite works fine for MVP but hits limits around 100k+ rows. Plan to migrate to Postgres if you scale past 10k candidates.
2. **No offline support:** The app requires internet to work.
3. **No real-time:** We're not using WebSockets; refreshing the page gets latest data.
4. **Llama 3.3 latency:** If using Ollama locally, genetranslate may be slow on first run (model loading). Plan for ~2–5s first response.
5. **No SSO yet:** Only email/password auth. SSO (Google, Microsoft) can be added later.

---

## Communication

When Claude Code encounters:
- **Ambiguous design decision:** Ask for clarification (don't guess)
- **A breaking change:** Flag it explicitly before committing
- **Performance concerns:** Estimate and flag before building
- **Missing information:** Check this file, ask in the prompt, don't assume

---

**Last updated:** June 2026  
**Maintained by:** Sneha (Founder, Support Nest)  
**For questions:** Refer back to this document; it's the source of truth.
