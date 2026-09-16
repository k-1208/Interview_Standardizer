# Organization onboarding

This app treats **Workspace** as the tenant boundary (candidates, uploads, interviews). **User.organizationName** is display metadata; access control is **WorkspaceMember** + **WorkspaceRole**.

## Recommended flows

### 1. Founder (creates the organization)

1. **Sign up** at `/register` with name, work email, organization name, password.
2. Backend atomically creates:
   - `User`
   - `Workspace` (slug from org name, user as owner)
   - `WorkspaceMember` with role `super_admin`
3. **Land in dashboard** — upload first resumes or skip to settings.
4. **Invite team** from Settings (`POST /api/user/invite`) — admins/reviewers get email with `/invite/{token}`.

Optional later steps (product, not all built yet):

- Confirm work email (magic link / OTP)
- Short wizard: hiring program name, default interview rubric
- Require at least one admin before going live

### 2. Team member (joins existing organization)

1. Open invite link → `/invite/{token}`.
2. **Sign in** (existing account) or **Create account** (invite registration — no new workspace).
3. Email on the account **must match** the invitation.
4. Accept invite → `WorkspaceMember` created with invited role → dashboard with that workspace.

### 3. Roles

| Role          | Typical use                          |
|---------------|--------------------------------------|
| `super_admin` | Workspace owner (first signup)       |
| `admin`       | Invite users, manage workspace       |
| `reviewer`    | Review candidates, run interviews    |

## Auth model (current)

- **JWT** (7 days), signed with `JWT_SECRET`.
- Token via **httpOnly cookie** (`token`) and **Bearer** header (frontend stores in `localStorage` as `auth_token`).
- Protected routes use `requireAuth` middleware; APIs scope data by `workspaceId` + membership checks.

## Environment (auth + invites)

**Backend** (`backend/.env`):

```bash
JWT_SECRET=<long random string>   # required in production
FRONTEND_URL=http://localhost:3000  # invite links in email
# Database + Redis — see README
# SMTP_* — required for invite emails
```

**Frontend** (`frontend/.env` or `.env.local`):

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

## Multi-organization

- One user can belong to **many workspaces** (memberships from signup, invites, or **Create organization**).
- The dashboard header **organization switcher** sets `selected_workspace_id` in localStorage and reloads page data for that tenant.
- **New org:** `POST /api/workspaces` with `{ "name": "..." }` — user becomes owner and `super_admin`.
- Candidates, uploads, dashboard KPIs, and settings are scoped by the **active** `workspaceId` on each API call.

## API summary

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/workspaces` | Create another organization (authenticated) |
| POST | `/api/auth/register` | New org (body: `name`, `organizationName`, `email`, `password`) or join via invite (add `inviteToken`, omit `organizationName`) |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user + all workspace memberships |
| GET | `/api/user/profile?workspaceId=` | Dashboard/settings data for one workspace |
| GET | `/api/user/invite/:token` | Validate invite (public) |
| POST | `/api/user/invite/accept` | Accept invite (authenticated) |
| POST | `/api/user/invite` | Send invite (authenticated) |

## Local smoke test

```bash
# Terminal 1 — API
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev

# Register founder
curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","organizationName":"Plaksha Admissions","email":"ada@example.com","password":"secure-pass"}'
```

Then sign in at `http://localhost:3000`, open Settings, invite a colleague, and complete flow from the email link.
