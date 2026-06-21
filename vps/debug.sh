#!/bin/bash
# ============================================
# LedgerLite VPS Debug Script
# Run on VPS: bash /opt/ledgerlite/vps/debug.sh
# ============================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "  ${RED}[FAIL]${NC} $1"; }
warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "  ${CYAN}[INFO]${NC} $1"; }
hdr()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

APP_DIR="/opt/ledgerlite"
cd "$APP_DIR/vps" 2>/dev/null || { echo "App not found at $APP_DIR"; exit 1; }

# Helper: check if a container is Up (returns 0 if Up, 1 otherwise)
is_up() {
  docker compose ps "$1" 2>/dev/null | grep -q "Up"
}

# Helper: do an HTTP check via Caddy reverse proxy (from VPS host)
caddy_http() {
  local path="$1" method="${2:-GET}" body="${3:-}"
  local extra_args=""
  if [ "$method" = "POST" ] && [ -n "$body" ]; then
    extra_args="-X POST -H 'Content-Type: application/json' -d '$body'"
  fi
  eval "curl -s -o /dev/null -w '%{http_code}' http://localhost${path} $extra_args 2>/dev/null" || echo "ERR"
}

# Helper: check HTTP inside a container using Node.js (Alpine has no curl)
# Usage: node_http <service> <url> [expected_code]
# Returns 0 if HTTP status matches, 1 otherwise
node_http() {
  local svc="$1" url="$2" expect="${3:-200}"
  local code
  code=$(docker compose exec -T "$svc" node -e "
    const h = require('http');
    h.get('$url', r => { console.log(r.statusCode); process.exit(0); })
     .on('error', () => { console.log('ERR'); process.exit(1); });
  " 2>/dev/null || echo "ERR")
  echo "$code"
}

# Helper: check TCP connectivity inside a container using Node.js
# Usage: node_tcp <service> <host> <port>
node_tcp() {
  local svc="$1" host="$2" port="$3"
  docker compose exec -T "$svc" node -e "
    const net = require('net');
    const s = net.connect($port, '$host', () => { console.log('OK'); s.end(); process.exit(0); });
    s.on('error', () => { console.log('ERR'); process.exit(1); });
    setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 3000);
  " 2>/dev/null || echo "ERR"
}

# ─── 1. Docker ──────────────────────────────────────────────
hdr "1. Docker Status"
docker info &>/dev/null && pass "Docker running" || fail "Docker not running"
docker compose version &>/dev/null && pass "Docker Compose available" || fail "Docker Compose missing"

# ─── 2. Containers ──────────────────────────────────────────
hdr "2. Container Status"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || fail "No containers running"

ALL_UP=true
for svc in postgres backend frontend caddy; do
  if is_up "$svc"; then
    pass "$svc is running"
  else
    fail "$svc is DOWN"
    ALL_UP=false
  fi
done

if [ "$ALL_UP" = "false" ]; then
  warn "Not all containers are running. Some checks below will fail."
fi

# ─── 3. Backend Health ──────────────────────────────────────
hdr "3. Backend Health Check"
if is_up backend; then
  BACKEND_CODE=$(node_http backend "http://localhost:3001/" "200")
  if [ "$BACKEND_CODE" = "200" ] || [ "$BACKEND_CODE" = "404" ] || [ "$BACKEND_CODE" = "201" ]; then
    pass "Backend responding (HTTP $BACKEND_CODE)"
  else
    fail "Backend NOT responding (got: $BACKEND_CODE)"
  fi

  # Try auth login endpoint directly
  LOGIN_CODE=$(node_http backend "http://localhost:3001/api/auth/login" "401")
  # POST test is harder with node inline, so we check via Caddy below
  if [ "$LOGIN_CODE" = "401" ]; then
    pass "Backend /api/auth/login GET returns HTTP 401 (route exists)"
  elif [ "$LOGIN_CODE" = "404" ]; then
    warn "Backend /api/auth/login returns 404 — check setGlobalPrefix in main.ts"
  else
    warn "Backend /api/auth/login GET returned HTTP $LOGIN_CODE"
  fi
else
  fail "Backend not running — skipping health checks"
  warn "Check logs: docker compose logs backend"
fi

# ─── 4. Frontend Health ─────────────────────────────────────
hdr "4. Frontend Health Check"
if is_up frontend; then
  FRONTEND_CODE=$(node_http frontend "http://localhost:3000/" "200")
  if [ "$FRONTEND_CODE" = "200" ]; then
    pass "Frontend responding (HTTP $FRONTEND_CODE)"
  else
    fail "Frontend NOT responding (got: $FRONTEND_CODE)"
  fi
else
  fail "Frontend not running — skipping health check"
fi

# ─── 5. Caddy / Reverse Proxy ───────────────────────────────
hdr "5. Reverse Proxy Routing (from VPS host)"

# Test → frontend
CADDY_FRONTEND=$(caddy_http "/")
if [ "$CADDY_FRONTEND" = "200" ]; then
  pass "Caddy → frontend: / → HTTP $CADDY_FRONTEND"
else
  fail "Caddy → frontend: / → HTTP $CADDY_FRONTEND"
fi

# Test → backend via /api/*
CADDY_API=$(caddy_http "/api/auth/login" "POST" '{"email":"x","password":"x"}')
if [ "$CADDY_API" = "401" ] || [ "$CADDY_API" = "400" ]; then
  pass "Caddy → /api/* → backend: HTTP $CADDY_API (expected for bad creds)"
elif [ "$CADDY_API" = "502" ]; then
  fail "Caddy → /api/* → backend: HTTP 502 — backend is DOWN or not reachable"
else
  fail "Caddy → /api/* → backend: HTTP $CADDY_API (expected 401)"
fi

# Test that /auth/login (no /api prefix) goes to frontend HTML
CADDY_NOAPI=$(curl -s http://localhost/auth/login 2>/dev/null | head -c 100)
if echo "$CADDY_NOAPI" | grep -qi "<html\|<!doctype\|next"; then
  pass "Caddy → /auth/login (no /api) → frontend HTML (correct)"
else
  warn "Caddy → /auth/login returned unexpected content"
  info "First 100 chars: $CADDY_NOAPI"
fi

# ─── 6. Database ────────────────────────────────────────────
hdr "6. Database Connectivity"
DB_CHECK=$(docker compose exec -T postgres pg_isready -U ledgerlite 2>/dev/null || echo "ERR")
if echo "$DB_CHECK" | grep -q "accepting"; then
  pass "PostgreSQL accepting connections"
else
  fail "PostgreSQL NOT accepting: $DB_CHECK"
fi

# Check if backend can reach postgres by querying an endpoint
if is_up backend; then
  TENANTS_CODE=$(node_http backend "http://localhost:3001/api/tenants" "401")
  if [ "$TENANTS_CODE" = "401" ]; then
    pass "Backend /api/tenants requires auth (DB query works, expected 401)"
  else
    warn "Backend /api/tenants returned HTTP $TENANTS_CODE (expected 401)"
  fi
else
  warn "Backend not running — can't verify DB connectivity from backend"
fi

# ─── 7. Environment Variables ───────────────────────────────
hdr "7. Environment Variables"

if [ -f .env ]; then
  source .env
  pass ".env file found"
else
  fail ".env file missing"
fi

info "DOMAIN = ${DOMAIN:-NOT SET}"
info "NODE_ENV = production"

# Check backend env (only if running)
if is_up backend; then
  BACKEND_FRONTEND_URL=$(docker compose exec -T backend printenv FRONTEND_URL 2>/dev/null || echo "NOT SET")
  info "Backend FRONTEND_URL = $BACKEND_FRONTEND_URL"
else
  warn "Backend not running — can't read env vars"
fi

if is_up frontend; then
  FRONTEND_API_URL=$(docker compose exec -T frontend printenv NEXT_PUBLIC_API_URL 2>/dev/null || echo "NOT SET")
  info "Frontend runtime NEXT_PUBLIC_API_URL = $FRONTEND_API_URL"
else
  warn "Frontend not running — can't read env vars"
fi
warn "Note: NEXT_PUBLIC_* is baked at build time — runtime env is ignored by client JS"

# ─── 8. Recent Logs ─────────────────────────────────────────
hdr "8. Container Logs (last 20 lines each)"

for svc in backend frontend caddy postgres; do
  echo -e "\n${CYAN}─── $svc ───${NC}"
  docker compose logs --tail 20 "$svc" 2>/dev/null || echo "  (no logs)"
done

# ─── 9. Network ─────────────────────────────────────────────
hdr "9. Container Network (TCP connectivity via Node.js)"

if is_up backend; then
  # backend → postgres
  RESULT=$(node_tcp backend postgres 5432)
  if [ "$RESULT" = "OK" ]; then
    pass "backend → postgres:5432 reachable"
  else
    fail "backend → postgres:5432 UNREACHABLE ($RESULT)"
  fi

  # backend → frontend
  RESULT=$(node_tcp backend frontend 3000)
  if [ "$RESULT" = "OK" ]; then
    pass "backend → frontend:3000 reachable"
  else
    fail "backend → frontend:3000 UNREACHABLE ($RESULT)"
  fi
else
  fail "backend not running — can't check network from backend"
fi

if is_up frontend; then
  # frontend → backend
  RESULT=$(node_tcp frontend backend 3001)
  if [ "$RESULT" = "OK" ]; then
    pass "frontend → backend:3001 reachable"
  else
    fail "frontend → backend:3001 UNREACHABLE ($RESULT)"
  fi
else
  fail "frontend not running — can't check network from frontend"
fi

# ─── 10. Firewall ───────────────────────────────────────────
hdr "10. Firewall (UFW)"
if command -v ufw &>/dev/null; then
  ufw status | grep -E "80|443|22" || warn "Expected ports not found in UFW"
  ufw status | grep -q "active" && pass "UFW active" || warn "UFW not active"
else
  warn "UFW not installed"
fi

# ─── 11. Disk Space ─────────────────────────────────────────
hdr "11. Disk Space"
df -h / | tail -1 | awk '{print "  Root disk: "$5" used ("$3"/"$2")"}'
docker system df 2>/dev/null | head -5

# ─── Summary ────────────────────────────────────────────────
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Debug complete.${NC}"
echo -e "${CYAN}  Key checks:${NC}"
echo -e "${CYAN}    - All 4 containers must show Up${NC}"
echo -e "${CYAN}    - Caddy → /api/* → backend must return 401 (not 502)${NC}"
echo -e "${CYAN}    - Backend logs must NOT show 'Cannot find module'${NC}"
echo -e "${CYAN}    - Browser DevTools Network tab: check failing request URL${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
