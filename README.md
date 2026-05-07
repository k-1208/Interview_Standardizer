# AI Product

## Overview
AI Product is a full-stack admissions workflow app. It ingests candidate resumes, parses them into structured profiles, generates interview questions, and supports interview operations like dispatching a meeting bot for transcript capture. The backend exposes the APIs and async workers, while the frontend provides the reviewer dashboard and candidate views.

## Architecture
- Frontend (Next.js): Reviewer dashboard, candidate profiles, question generation, and meeting bot dispatch UI.
- Backend (Express + Prisma): API layer for auth, candidates, uploads, AI question generation, and bot dispatch.
- Queue Worker (BullMQ): Asynchronous PDF parsing and resume extraction.
- Data Store: MySQL/MariaDB (via Prisma) for persistent data; Redis for queue state.
- External Services: Gemini for question generation; Recall.ai for meeting bot + transcript.

## Data Flow
1. Upload resume (frontend) → backend upload API → stored file metadata.
2. Worker parses PDF → structured candidate data saved to DB.
3. Candidate profile view pulls structured data from backend.
4. Generate Questions → backend AI service → questions stored + returned.
5. Send Bot → backend Recall.ai integration → bot joins meeting and captures transcript.

## Prerequisites
- Node.js (LTS)
- npm
- A running database for the backend (see backend .env)
- Redis (for the queue worker)

## Backend

### 1) Install dependencies
```bash
cd backend
npm install
```

### 2) Configure environment
Create backend/.env with placeholders like:
```bash
PORT=4000
DATABASE_HOST=<db_host>
DATABASE_USER=<db_user>
DATABASE_PASSWORD=<db_password>
DATABASE_NAME=<db_name>
DATABASE_PORT=3306
REDIS_HOST=<redis_host>
REDIS_PORT=6379
REDIS_PASSWORD=<redis_password>
GEMINI_API_KEY=<gemini_api_key>
RECALL_API_KEY=<recall_api_key>
```

### 3) Run the API server
```bash
npm run dev
```

### 4) (Optional) Run the PDF worker
```bash
npm run worker
```

## Frontend

### 1) Install dependencies
```bash
cd frontend
npm install
```

### 2) Configure environment
Create frontend/.env.local with placeholders like:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 3) Start the dev server
```bash
npm run dev
```

## Notes
- Start the backend first so the frontend can connect to it.
- The Recall bot feature requires a valid `RECALL_API_KEY`.
- For production, use `npm run build` and `npm start` in each app.
