# Deployment guide (Docker)

This guide takes a fresh Linux server to a running, HTTPS-served instance of the app.
Everything runs with Docker Compose: Postgres, Redis, a one-shot migration job,
the API, the queue workers and the Next.js frontend.

```
            https://app.example.com            https://api.example.com
                     │                                  │
              ┌──────┴──────────── Caddy (TLS) ─────────┴──────┐
              ▼                                                ▼
        frontend :3000                                   backend :4000 ──► worker
                                                               │             │
                                                        postgres  ◄──────────┤
                                                        redis     ◄──────────┘
```

> Want to try it on your laptop first? Jump to [Local run](#local-run-no-domain).

---

## 1. What you need

| Item | Notes |
|------|-------|
| A Linux server | Ubuntu 22.04/24.04, **2 vCPU / 4 GB RAM** minimum (the image builds need the memory), 20 GB disk |
| A domain | Two DNS names on the **same** parent domain, e.g. `app.example.com` and `api.example.com` |
| AWS S3 bucket + IAM key | Resume PDFs are stored here. Key needs `s3:PutObject`, `s3:GetObject` on the bucket |
| Gemini API key | Resume parsing, questions, evaluation. Can also be set per workspace later |
| Recall.ai API key | Optional — only for the Zoom/Meet interview bot |
| SMTP account | Invitation emails (e.g. Gmail with an app password) |

Open ports **22, 80 and 443** on the server firewall / security group. Do **not** open 3000 or 4000.

## 2. DNS

Create two `A` records pointing to the server's public IP:

```
app.example.com  →  <server IP>
api.example.com  →  <server IP>
```

Using two subdomains of one domain keeps the login cookie "same-site", so `COOKIE_SAME_SITE=lax` works.

## 3. Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER     # log out and back in after this
docker compose version            # should print v2.x
```

## 4. Get the code

```bash
git clone git@github.com:tecap-adm-plk/admission_interview_helper.git
cd admission_interview_helper
git checkout staging              # or main, once it is merged
```

## 5. Configure `.env.docker`

```bash
cp .env.docker.example .env.docker
openssl rand -hex 32              # run twice: one value for JWT_SECRET, one for SETTINGS_ENCRYPTION_KEY
nano .env.docker
```

Set at least these values:

```dotenv
# Database (bundled container) — change the password
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong password>
POSTGRES_DB=ai_product

# Public URLs (no trailing slash)
NEXT_PUBLIC_BACKEND_URL=https://api.example.com
FRONTEND_URL=https://app.example.com
APP_BASE_URL=https://app.example.com

# Auth
JWT_SECRET=<openssl output #1>
COOKIE_SAME_SITE=lax
TRUST_PROXY=true

# Encrypts workspace API keys saved in Settings — never change it afterwards
SETTINGS_ENCRYPTION_KEY=<openssl output #2>

# AI (server-wide defaults; workspaces can override in Settings)
GEMINI_API_KEY=<key>
RECALL_API_KEY=<key or empty>

# S3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY=<key id>
AWS_SECRET_KEY=<secret>
S3_BUCKET=<bucket name>

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASS=<app password>
SMTP_FROM_EMAIL=<from address>

# Only expose the app ports to the reverse proxy on this machine
BACKEND_PORT=127.0.0.1:4000
FRONTEND_PORT=127.0.0.1:3000
```

Notes:

- `NEXT_PUBLIC_BACKEND_URL` is baked into the frontend **at build time**. If you change it, rebuild (`up -d --build frontend`).
- `FRONTEND_URL` is added to the API's CORS allow-list and used for links in invitation emails.
- The API refuses to start if `JWT_SECRET` is missing, shorter than 32 characters, or still the example placeholder.
- The API and worker refuse to start if `NODE_ENV` is anything other than `development`, `test` or `production` (a typo like `prod` would otherwise silently disable production-only protections), or if `NODE_ENV=production` and `FRONTEND_URL` is missing or uses plain `http://` on a non-localhost host.
- The containers run with `NODE_ENV=production`, so the login cookie is `Secure` — **the app must be served over HTTPS** (or on `localhost`).
- Frontend and API on completely different domains (e.g. Vercel + your server)? Use `COOKIE_SAME_SITE=none` (HTTPS required).
- External database (Supabase, RDS): set `DATABASE_URL` and `DIRECT_URL` here; the bundled Postgres is then unused.
- `.env.docker` is git-ignored. Keep it out of the repository.

## 6. Build and start

```bash
docker compose --env-file .env.docker up -d --build
```

The first build takes a few minutes. Start-up order is automatic:

1. `postgres` and `redis` become healthy
2. `migrate` runs `prisma migrate deploy` and exits
3. `backend` and `worker` start; `backend` turns healthy once `/ready` passes
4. `frontend` starts

Check it:

```bash
docker compose --env-file .env.docker ps          # migrate = exited (0), others = running/healthy
curl -s http://127.0.0.1:4000/ready               # {"status":"OK",...}
docker compose --env-file .env.docker logs -f backend worker
```

## 7. HTTPS with Caddy

Caddy gets and renews Let's Encrypt certificates automatically.

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

`/etc/caddy/Caddyfile`:

```caddy
app.example.com {
    reverse_proxy 127.0.0.1:3000
}

api.example.com {
    request_body max_size 20MB
    reverse_proxy 127.0.0.1:4000
}
```

```bash
sudo systemctl reload caddy
curl -s https://api.example.com/health
```

Open `https://app.example.com`.

(Nginx works too — proxy the same two hosts and set `X-Forwarded-Proto`/`X-Forwarded-For`; keep `TRUST_PROXY=true`.)

## 8. First login and setup

**Plaksha default organisation (optional).** Instead of registering, seed the `Plaksha` workspace with its owner (`super_admin`) and first admin:

```bash
docker compose --env-file .env.docker exec backend node dist/src/scripts/seedPlaksha.js
# outside Docker: cd backend && npm run seed:plaksha
```

It is idempotent and only adds missing records; existing passwords are kept unless you pass `--reset-passwords`. Override the initial passwords with `SEED_SUPER_ADMIN_PASSWORD` / `SEED_ADMIN_PASSWORD`, and have both users change them after first login.

1. Go to `https://app.example.com/register` and create the founder account. This creates the organization's workspace with you as `super_admin`.
   Passwords need 8+ characters with upper case, lower case, a number and a symbol.
2. **Settings → API keys** (admins only): optionally save a workspace-specific Gemini / Recall.ai key. Saved keys are encrypted and shown masked; without one, the server keys from `.env.docker` are used.
3. **Settings → Invite**: invite admins and reviewers. They receive an email link to `/invite/<token>`.
4. Upload a resume PDF and confirm the candidate appears after parsing (watch `docker compose logs -f worker`).

### Recall.ai webhook (interview bot)

In the Recall.ai dashboard set the webhook URL to:

```
https://api.example.com/api/webhooks/recall
```

## 9. Updating to a new version

```bash
cd admission_interview_helper
git pull
docker compose --env-file .env.docker up -d --build
```

New database migrations run automatically through the `migrate` service before the API restarts.
Users stay logged in unless `JWT_SECRET` changes.

## 10. Operations

| Task | Command |
|------|---------|
| Status | `docker compose --env-file .env.docker ps` |
| Logs | `docker compose --env-file .env.docker logs -f --tail=200 backend worker` |
| Restart one service | `docker compose --env-file .env.docker restart backend` |
| More PDF throughput | `docker compose --env-file .env.docker up -d --scale worker=3` |
| Stop (keeps data) | `docker compose --env-file .env.docker down` |
| Queue backlog | `docker compose --env-file .env.docker exec redis redis-cli keys 'bull:*:wait'` |

**Never** run `docker compose down -v` in production — `-v` deletes the database and Redis volumes.

### Backups

```bash
# Backup
docker compose --env-file .env.docker exec -T postgres \
  pg_dump -U postgres -d ai_product -Fc > backup_$(date +%F).dump

# Restore into a running stack
docker compose --env-file .env.docker exec -T postgres \
  pg_restore -U postgres -d ai_product --clean --if-exists < backup_2026-11-23.dump
```

Schedule the backup with cron and copy the files off the server (e.g. to S3).
Also keep a safe copy of `.env.docker` — losing `SETTINGS_ENCRYPTION_KEY` makes saved workspace API keys unreadable.

## Local run (no domain)

```bash
cp .env.docker.example .env.docker
# set JWT_SECRET (openssl rand -hex 32), AWS/S3, GEMINI_API_KEY; leave URLs on localhost
docker compose --env-file .env.docker up -d --build
```

Open http://localhost:3000. Browsers treat `localhost` as secure, so the login cookie works without HTTPS.
If port 3000 or 4000 is taken, set `FRONTEND_PORT` / `BACKEND_PORT` (and match `NEXT_PUBLIC_BACKEND_URL` / `FRONTEND_URL`).

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `backend` exits: `JWT_SECRET ...` | Missing, too short or placeholder value — generate with `openssl rand -hex 32` |
| `backend` exits: `AWS credentials are missing` | Set `AWS_ACCESS_KEY` and `AWS_SECRET_KEY` |
| `migrate` exited with non-zero code | `docker compose logs migrate` — usually a wrong `DATABASE_URL` or unreachable DB |
| `backend` stays `unhealthy` | `curl 127.0.0.1:4000/ready` shows which check (database/redis) fails |
| Login succeeds but you are bounced back to login | Cookie not stored: site not on HTTPS, or frontend/API on different sites with `COOKIE_SAME_SITE=lax` (use `none`) |
| Browser console: CORS / "Origin not allowed" | `FRONTEND_URL` doesn't exactly match the browser origin (scheme, host, no trailing slash) |
| Browser console: CSP blocks requests to the API | `NEXT_PUBLIC_BACKEND_URL` was different at build time — rebuild the frontend |
| Resumes stay "uploaded" | Worker not running or failing: `docker compose logs worker`; check Gemini key and S3 access |
| No invitation emails | Check SMTP values and `docker compose logs worker` |
| "API key not valid" from Gemini | Wrong server key, or a wrong workspace key in Settings → API keys |
