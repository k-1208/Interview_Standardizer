# AI Product

## Overview
AI Product is a full-stack admissions workflow app. It ingests candidate resumes, parses them into structured profiles with an AI summary, generates interview questions, and supports interview operations like dispatching a meeting bot for transcript capture. The backend exposes the APIs and async workers; the frontend provides the reviewer dashboard and candidate views.

## Architecture
- **Frontend (Next.js 16):** reviewer dashboard, candidate profiles, question generation, meeting bot dispatch.
- **Backend (Express 5 + Prisma 7):** API for auth, workspaces, candidates, uploads, AI question generation and bot dispatch.
- **Queue workers (BullMQ on Redis):** asynchronous resume parsing and email dispatch. They run inside the API process by default, or as a separate process/container.
- **Data stores:** PostgreSQL (Supabase-compatible) for application data; Redis for job queues; S3 for uploaded resume PDFs.
- **External services:** Gemini (resume parsing, profile summary, question generation); Recall.ai (meeting bot + transcript); SMTP (emails).

## Data Flow
1. **Upload:** the frontend uploads a PDF → the API stores it in S3, creates a `resume_files` row (`uploaded`) and enqueues a `parse-pdf` job.
2. **Parse:** a worker extracts the PDF text and makes **one** Gemini call that returns the structured profile *and* the AI summary (`profile.aiSummary`: summary, key insights, growth areas). The candidate and related records are saved, and the file is marked `parsed` (or `failed`). Jobs retry up to 3 times with exponential backoff.
3. **Profile:** the candidate profile page reads the structured data, including the AI summary.
4. **Generate questions:** the API generates questions with Gemini, stores them and returns them with a quick rule-based quality score. The LLM-graded evaluation runs in the background and is only logged, so it never delays the response. Previously generated questions are returned without any AI call.
5. **Send bot:** the API asks Recall.ai to send a bot to the meeting; the Recall webhook later delivers the transcript, which is analysed and stored.
6. **Emails** (invites, assignment and interview notifications) go through the email queue, with a direct SMTP fallback if Redis is unavailable.

## Prerequisites
- Node.js 22 (LTS) and npm
- PostgreSQL
- Redis 6+ (use `maxmemory-policy noeviction`, as BullMQ requires)
- An S3 bucket and AWS credentials, plus a Gemini API key

Or just Docker — see [Docker (full stack)](#docker-full-stack).

## Docker (full stack)

`docker-compose.yml` runs Postgres, Redis, a one-shot migration job, the API, the queue workers and the frontend.

```bash
cp .env.docker.example .env.docker   # fill in JWT_SECRET, AWS/S3, Gemini, Recall, SMTP
docker compose --env-file .env.docker up -d --build
```

| Service    | What it does                                                    |
|------------|-----------------------------------------------------------------|
| `postgres` | Database (volume `postgres-data`)                               |
| `redis`    | Job queues (append-only persistence, volume `redis-data`)       |
| `migrate`  | Runs `prisma migrate deploy` once, then exits                   |
| `backend`  | API on port 4000 (`RUN_WORKERS=false`)                          |
| `worker`   | PDF + email queue workers (`node dist/src/worker.js`)           |
| `frontend` | Next.js standalone server on port 3000                          |

- Frontend: http://localhost:3000 · API liveness: http://localhost:4000/health · readiness: http://localhost:4000/ready
- The `backend` container's healthcheck uses `/ready` (Postgres + Redis reachable); the frontend starts once the backend is healthy.
- Migrations finish before the API and workers start.
- `NEXT_PUBLIC_BACKEND_URL` is baked into the frontend at **build** time — rebuild the frontend image if it changes.
- To use an external database (e.g. Supabase), set `DATABASE_URL`/`DIRECT_URL` in `.env.docker`; the bundled Postgres can then be ignored.
- Change the host ports with `BACKEND_PORT` / `FRONTEND_PORT`.
- Scale workers with `docker compose --env-file .env.docker up -d --scale worker=3`.
- The API and workers refuse to start without the AWS and Gemini variables set.

## Local development

### Backend

```bash
cd backend
npm install
cp .env.example .env        # then fill in values (see table below)
npx prisma migrate deploy   # apply the Postgres schema
npm run dev                 # API (+ workers) with reload
```

To run the workers in their own process, set `RUN_WORKERS=false` for the API and run:
```bash
npm run build && npm run worker
```

A local Redis is enough for development, e.g. `docker run -d -p 6379:6379 redis:7-alpine`.

Organization signup, team invites and roles are documented in [docs/ORGANIZATION_ONBOARDING.md](docs/ORGANIZATION_ONBOARDING.md).

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:4000" > .env.local
npm run dev
```

Start the backend first so the frontend can connect to it.

## Environment variables (backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | API port (default `4000`) |
| `DATABASE_URL` | yes* | Postgres connection string. *Alternatively `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_PORT` |
| `DIRECT_URL` | no | Direct (non-pooled) connection used for migrations, e.g. with Supabase pgbouncer |
| `REDIS_URL` | yes | e.g. `redis://localhost:6379` |
| `PDF_QUEUE_NAME` / `EMAIL_QUEUE_NAME` | no | Queue names (default `pdf-processing` / `email-dispatch`) |
| `RUN_WORKERS` | no | `false` to keep workers out of the API process (default `true`) |
| `JWT_SECRET` | yes | Long random string used to sign login tokens |
| `FRONTEND_URL` | yes | Browser URL of the frontend; used for CORS and links in emails |
| `AWS_REGION`, `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `S3_BUCKET` | yes | Resume storage |
| `GEMINI_API_KEY` | yes | Gemini key; `GEMINI_MODEL` / `GEMINI_EVALUATION_MODEL` optionally override the models |
| `GEMINI_PARSE_TIMEOUT_MS`, `GEMINI_QUESTIONS_TIMEOUT_MS`, `GEMINI_EVALUATION_TIMEOUT_MS`, `GEMINI_TRANSCRIPT_TIMEOUT_MS` | no | Per-call AI time limits (defaults 90s / 60s / 60s / 90s) |
| `RECALL_API_KEY` | for bots | Recall.ai key; `RECALL_API_BASE_URL` optionally overrides the region |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL` | for email | Outgoing mail |

Frontend: `NEXT_PUBLIC_BACKEND_URL` — browser URL of the API.

## Candidate API

All routes require auth and a `workspaceId` (query or body) for a workspace the user belongs to.

| Method & path | Who | Description |
|---------------|-----|-------------|
| `GET /api/candidates` | all members | List candidates (reviewers see only those assigned to them) |
| `GET /api/candidates/:id` | all members | Full candidate profile, including `aiSummary` |
| `GET /api/candidates/:id/transcript-analysis` | all members | Latest interview transcript analysis |
| `POST /api/candidates/:id/assign` | admin, super_admin | Assign a reviewer (emails them) |
| `DELETE /api/candidates/:id` | admin, super_admin | Soft-delete the candidate (see below) |

### Deleting candidates (soft delete)
The **Delete** button on the candidate profile (admins and super admins only) does not remove any data. It sets `isDeleted = true`, `deletedAt` and `deletedById` on the candidate. Deleted candidates are hidden from the candidate list, profile pages, dashboard counts and reviewer assignments, but the row and all related records (essays, academic records, questions, transcripts, resume files) stay in the database. To restore one, set `isDeleted = false` in the database.

### AI summary storage
`candidates.aiSummary` stores JSON text: `{ "summary": "...", "keyInsights": [...], "growthAreas": [...] }`. Rows created before this change hold a plain-text summary; the API normalises both into the same object shape.

## Reliability notes
- **Health:** `GET /health` only says the process is up; `GET /ready` returns 503 with per-dependency status when Postgres or Redis is unreachable.
- **AI time limits:** every Gemini call has a timeout. A timed-out resume parse is retried by the queue; a timed-out question generation returns `504` with a "try again" message.
- **Parse retries are safe:** a retried job first checks whether the file is already linked to a candidate and, if so, just marks it `parsed`. Files stay `uploaded` between retries and only become `failed` after the last attempt.
- **Errors:** expected errors are thrown as `HttpError(status, message)` (`backend/src/utils/httpError.ts`) and returned as-is. Anything else is logged server-side and the client gets a generic message — internal details (database, Recall, stack traces) never reach the browser.
- **Process safety net:** unhandled promise rejections are logged; uncaught exceptions are logged and the process exits so Docker restarts it.

## Database migrations
Migrations live in `backend/prisma/migrations` and are applied with `npx prisma migrate deploy` (automatic in Docker). After changing `schema.prisma`, create a new one with `npx prisma migrate dev --name <change>` and commit the generated folder — a migration missing from git will fail on fresh databases.

## Troubleshooting
- **Uploads stay in `uploaded`:** no worker is running or Redis is unreachable — check the `worker` logs and `REDIS_URL`.
- **File marked `failed`:** check the worker logs for the Gemini/S3 error; the job already retried 3 times.
- **A request returned a generic error message:** the real error is in the backend logs, prefixed with `[controller/handler]`.
- **Profile shows "No summary available yet":** the candidate was parsed before the summary fix, or the model returned no summary (the parse log line shows `hasSummary: false`).
- **CORS errors:** the frontend's origin must match `FRONTEND_URL`.
- **Frontend calls the wrong API URL in Docker:** rebuild the frontend image after changing `NEXT_PUBLIC_BACKEND_URL`.
