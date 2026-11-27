#!/usr/bin/env bash
# One-command setup for the full stack (Postgres, Redis, migrations, API,
# workers, frontend) plus the Plaksha seed data.
#
#   ./run.sh                    set up .env.docker, build, start, migrate, seed
#   ./run.sh seed [--reset-passwords]   re-run only the Plaksha seed
#   ./run.sh status | logs | down
#
# Safe to run repeatedly: existing values in .env.docker are never overwritten,
# migrations only apply what is new, and the seed only adds what is missing.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

ENV_FILE=".env.docker"
ENV_EXAMPLE=".env.docker.example"
BACKEND_ENV="backend/.env"
# Keys that may be copied from backend/.env when empty in .env.docker.
# DATABASE_URL / DIRECT_URL / REDIS_URL are deliberately excluded so Docker
# always uses its own bundled Postgres and Redis.
IMPORTABLE_KEYS=(GEMINI_API_KEY GROQ_API_KEY RECALL_API_KEY AWS_ACCESS_KEY AWS_SECRET_KEY S3_BUCKET
  SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM_EMAIL)
REQUIRED_KEYS=(JWT_SECRET AWS_ACCESS_KEY AWS_SECRET_KEY)
RECOMMENDED_KEYS=(GEMINI_API_KEY S3_BUCKET SETTINGS_ENCRYPTION_KEY SMTP_USER SMTP_PASS)
WAIT_SECONDS=300

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m ✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m !\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m ✗\033[0m %s\n' "$*" >&2; exit 1; }

dc() { docker compose --env-file "$ENV_FILE" "$@"; }

# Value of KEY in FILE (last uncommented assignment), or empty.
get_env() {
  local file=$1 key=$2
  [[ -f $file ]] || return 0
  K="$key" awk 'BEGIN { k = ENVIRON["K"] "=" }
    index($0, k) == 1 { v = substr($0, length(k) + 1) } END { print v }' "$file"
}

# Set KEY=VALUE in FILE: replace the existing line or append one.
# Values are passed through the environment so no characters need escaping.
set_env() {
  local file=$1 key=$2 value=$3 tmp
  tmp="$(mktemp)"
  K="$key" V="$value" awk 'BEGIN { k = ENVIRON["K"]; v = ENVIRON["V"]; done = 0 }
    index($0, k "=") == 1 { if (!done) print k "=" v; done = 1; next }
    { print }
    END { if (!done) print k "=" v }' "$file" > "$tmp"
  cat "$tmp" > "$file" && rm -f "$tmp"
}

random_hex() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex 32
  else head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; fi
}

check_docker() {
  command -v docker >/dev/null 2>&1 || die "Docker is not installed: https://docs.docker.com/get-docker/"
  docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required (docker compose ...)."
  docker info >/dev/null 2>&1 || die "Docker daemon is not running (or this user can't access it)."
  ok "Docker $(docker version --format '{{.Server.Version}}' 2>/dev/null) is running"
}

prepare_env() {
  info "Preparing $ENV_FILE"
  if [[ ! -f $ENV_FILE ]]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    ok "Created $ENV_FILE from $ENV_EXAMPLE"
  fi

  # Secrets: generate only when missing or still a placeholder.
  local jwt; jwt="$(get_env "$ENV_FILE" JWT_SECRET)"
  if [[ -z $jwt || ${#jwt} -lt 32 || $jwt == change-me* || $jwt == *"<"* ]]; then
    set_env "$ENV_FILE" JWT_SECRET "$(random_hex)"
    ok "Generated JWT_SECRET"
  fi
  if [[ -z "$(get_env "$ENV_FILE" SETTINGS_ENCRYPTION_KEY)" ]]; then
    set_env "$ENV_FILE" SETTINGS_ENCRYPTION_KEY "$(random_hex)"
    ok "Generated SETTINGS_ENCRYPTION_KEY (back up $ENV_FILE; changing it later breaks saved API keys)"
  fi

  # Fill empty provider/AWS/SMTP keys from backend/.env when available.
  if [[ -f $BACKEND_ENV ]]; then
    local key value imported=()
    for key in "${IMPORTABLE_KEYS[@]}"; do
      [[ -n "$(get_env "$ENV_FILE" "$key")" ]] && continue
      value="$(get_env "$BACKEND_ENV" "$key")"
      [[ -z $value || $value == *"<"* ]] && continue
      set_env "$ENV_FILE" "$key" "$value"
      imported+=("$key")
    done
    ((${#imported[@]})) && ok "Copied from $BACKEND_ENV: ${imported[*]}"
  fi

  local missing=()
  for key in "${REQUIRED_KEYS[@]}"; do
    [[ -z "$(get_env "$ENV_FILE" "$key")" ]] && missing+=("$key")
  done
  ((${#missing[@]} == 0)) || die "Set these in $ENV_FILE, then re-run: ${missing[*]}"

  for key in "${RECOMMENDED_KEYS[@]}"; do
    [[ -z "$(get_env "$ENV_FILE" "$key")" ]] && warn "$key is empty (related features won't work)"
  done
  ok "$ENV_FILE is ready"
}

host_port() { # "127.0.0.1:3000" or "3000" -> 3000
  local v=${1:-$2}; echo "${v##*:}"
}

wait_for_backend() {
  info "Waiting for the API to become healthy"
  local id status deadline=$((SECONDS + WAIT_SECONDS))
  while ((SECONDS < deadline)); do
    id="$(dc ps -q backend 2>/dev/null || true)"
    if [[ -n $id ]]; then
      status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" 2>/dev/null || true)"
      [[ $status == healthy ]] && { ok "API is healthy"; return 0; }
      [[ $status == exited || $status == dead ]] && break
    fi
    sleep 3
  done
  dc logs --tail 40 migrate backend || true
  die "API did not become healthy (see logs above)."
}

wait_for_frontend() {
  local port; port="$(host_port "$(get_env "$ENV_FILE" FRONTEND_PORT)" 3000)"
  info "Waiting for the frontend on port $port"
  local deadline=$((SECONDS + WAIT_SECONDS))
  while ((SECONDS < deadline)); do
    curl -fsS -o /dev/null "http://127.0.0.1:$port" 2>/dev/null && { ok "Frontend is up"; return 0; }
    sleep 3
  done
  dc logs --tail 40 frontend || true
  die "Frontend did not respond (see logs above)."
}

run_seed() {
  info "Seeding the Plaksha organisation"
  dc exec -T backend node dist/src/scripts/seedPlaksha.js "$@"
}

summary() {
  local frontend_url backend_url
  frontend_url="$(get_env "$ENV_FILE" FRONTEND_URL)"
  backend_url="$(get_env "$ENV_FILE" NEXT_PUBLIC_BACKEND_URL)"
  cat <<EOF

$(ok "Everything is running")
  App      : ${frontend_url:-http://localhost:3000}
  API      : ${backend_url:-http://localhost:4000}  (health: /ready)

  Logins (workspace "Plaksha"):
    umair.rashid@plaksha.edu.in      super_admin (owner)
    kunal.gupta.ug23@plaksha.edu.in  admin
  Initial passwords are set by the seed (or SEED_*_PASSWORD in $ENV_FILE).
  Change them after first login.

  ./run.sh status | logs | down
EOF
}

cmd=${1:-up}
case $cmd in
  up)
    check_docker
    prepare_env
    info "Building and starting containers (first build takes a few minutes)"
    dc up -d --build
    wait_for_backend
    run_seed
    wait_for_frontend
    summary
    ;;
  seed)
    shift
    check_docker
    [[ -f $ENV_FILE ]] || die "$ENV_FILE not found; run ./run.sh first."
    run_seed "$@"
    ;;
  status) dc ps -a ;;
  logs)   shift; dc logs -f --tail 100 "$@" ;;
  down)   dc down; ok "Stopped (data volumes kept; 'docker compose --env-file $ENV_FILE down -v' deletes them)" ;;
  -h|--help|help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//' ;;
  *) die "Unknown command '$cmd'. Use: up | seed | status | logs | down" ;;
esac
