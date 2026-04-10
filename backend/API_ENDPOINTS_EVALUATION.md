# API Endpoints for Evaluation (Backend)

Date: 20 March 2026
Project: InterviewIQ (`backend`)

This document lists:
1. **Implemented endpoints** currently available in backend.
2. **Planned endpoints** inferred from current frontend flows + Prisma schema.
3. Which endpoints are **AI** vs **Non-AI**.
4. Suggested frontend pages to screenshot for submission.

---

## 1) Implemented Endpoints (Current Backend)

Base URL prefix: `/api`

| Method | Endpoint | Type | Purpose | Frontend screen to screenshot |
|---|---|---|---|---|
| GET | `/health` | Non-AI | Service health check (uptime + status). | N/A (optional: API client response screenshot) |
| POST | `/api/auth/register` | Non-AI | Create a new user account and issue JWT token cookie. | Login/Register screen (`/`) |
| POST | `/api/auth/login` | Non-AI | Authenticate user and issue JWT token cookie. | Login screen (`/`) |
| POST | `/api/auth/logout` | Non-AI | Clear auth cookie and logout user. | Dashboard header / user menu action (if wired) |
| GET | `/api/auth/me` | Non-AI | Return authenticated user profile and workspace memberships. | Any protected dashboard page (`/dashboard`) |

### Notes on current implementation
- Only `auth.routes.ts` is mounted in `backend/src/app.ts`.
- `candidate.routes.ts`, `Interview.routes.ts`, and `upload.routes.ts` are currently empty.
- No AI endpoint is implemented yet in backend code.

---

## 2) Planned Endpoints for Submission (Recommended)

These endpoints match existing product UI flows and database models.

## A. Non-AI Endpoints (Data CRUD / Retrieval)

| Method | Proposed Endpoint | Type | Purpose | Frontend screen to screenshot |
|---|---|---|---|---|
| GET | `/api/candidates` | Non-AI | List candidates (search/filter/sort). | Candidate Database (`/candidates`) |
| GET | `/api/candidates/:id` | Non-AI | Fetch full candidate profile details. | Candidate Profile (`/candidate/[id]`) |
| POST | `/api/candidates` | Non-AI | Save reviewed parsed candidate profile to DB. | Parsed Data Review save action (`/review`) |
| PATCH | `/api/candidates/:id` | Non-AI | Update candidate fields after manual edits. | Parsed Data Review edit controls (`/review`) |
| GET | `/api/dashboard/kpis` | Non-AI | Return KPI card metrics for dashboard. | Dashboard Home (`/dashboard`) |
| GET | `/api/dashboard/recent-candidates` | Non-AI | Return recent candidates table data. | Dashboard Home (`/dashboard`) |
| GET | `/api/interviews/sessions?candidateId=:id` | Non-AI | Return interview generation history for candidate. | Interview History (`/candidate/[id]/history`) |
| GET | `/api/interviews/sessions/:sessionId` | Non-AI | Return one generated interview set details. | Interview History details/compare |
| GET | `/api/export/candidate/:id` | Non-AI | Export candidate report (PDF/JSON). | Export page (`/export`) |

## B. AI Endpoints (Generation / Parsing)

| Method | Proposed Endpoint | Type | Purpose | Frontend screen to screenshot |
|---|---|---|---|---|
| POST | `/api/upload/parse` | AI | Parse uploaded PDF into structured candidate fields + confidence scores. | Upload + Parsing (`/upload`) |
| POST | `/api/candidates/:id/summary/generate` | AI | Generate AI candidate summary (strengths/growth areas). | Candidate Profile AI Summary (`/candidate/[id]`) |
| POST | `/api/candidates/:id/interview-questions/generate` | AI | Generate explainable interview questions by category/difficulty. | AI Questions (`/candidate/[id]/questions`) |
| POST | `/api/interviews/compare` | AI (optional) | AI-assisted comparison of two interview question sets. | Interview History compare action (`/candidate/[id]/history`) |

---

## 3) Suggested “Implementation Progress” Talking Points (5-min update)

- **Completed:** Auth API (`register`, `login`, `logout`, `me`) and health endpoint.
- **Backend data model ready:** Prisma schema includes `Candidate`, `ParsedField`, `InterviewQuestion`, `InterviewSession`, `Workspace`, `User`, etc.
- **Frontend flows ready (mocked):** Upload, review, candidate database, profile, AI questions, history, dashboard.
- **Next integration step:** Implement and mount `upload`, `candidate`, and `interview` routes so frontend pages consume real APIs.
- **AI scope:** Start with 2 AI endpoints first: PDF parsing + question generation.

---

## 4) Minimum Screenshot Set for Evaluation

1. Login screen (`/`) → for `POST /api/auth/login`.
2. Upload parsing screen (`/upload`) → for `POST /api/upload/parse` (AI).
3. Parsed review screen (`/review`) → for `POST/PATCH /api/candidates...`.
4. Candidate list (`/candidates`) → for `GET /api/candidates`.
5. Candidate profile + AI summary (`/candidate/[id]`) → for profile + summary generation.
6. AI questions screen (`/candidate/[id]/questions`) → for question generation endpoint.
7. Interview history (`/candidate/[id]/history`) → for history retrieval/compare.
8. Dashboard (`/dashboard`) → for KPI/recent candidate endpoints.

---

## 5) Reality Check (Important)

If this is demonstrated live, mention clearly:
- Auth endpoints are already functional.
- Most candidate/interview/upload endpoints above are **planned** and mapped to existing UI + schema, but still need implementation in backend route/controller files.
