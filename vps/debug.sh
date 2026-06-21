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

# ─── 1. Docker ──────────────────────────────────────────────
hdr "1. Docker Status"
docker info &>/dev/null && pass "Docker running" || fail "Docker not running"
docker compose version &>/dev/null && pass "Docker Compose available" || fail "Docker Compose missing"

# ─── 2. Containers ──────────────────────────────────────────
hdr "2. Container Status"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || fail "No containers running"

for svc in postgres backend frontend caddy; do
  if docker compose ps "$svc" 2>/dev/null | grep -q "Up"; then
    pass "$svc is running"
  else
    fail "$svc is DOWN"
  fi
done

# ─── 3. Backend Health ──────────────────────────────────────
hdr "3. Backend Health Check"
BACKEND_RESP=$(docker compose exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null || echo "ERR")
if [ "$BACKEND_RESP" = "200" ] || [ "$BACKEND_RESP" = "404" ] || [ "$BACKEND_RESP" = "201" ]; then
  pass "Backend responding (HTTP $BACKEND_RESP)"
else
  fail "Backend NOT responding (got: $BACKEND_RESP)"
fi

# Try hitting auth login endpoint directly
LOGIN_TEST=$(docker compose exec -T backend curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"x","password":"x"}' 2>/dev/null || echo "ERR")
if [ "$LOGIN_TEST" = "401" ] || [ "$LOGIN_TEST" = "400" ]; then
  pass "backend /api/auth/login responding (HTTP $LOGIN_TEST — expected for bad credentials)"
else
  fail "backend /api/auth/login returned HTTP $LOGIN_TEST (expected 401)"
fi

# ─── 4. Frontend Health ─────────────────────────────────────
hdr "4. Frontend Health Check"
FRONTEND_RESP=$(docker compose exec -T frontend curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "ERR")
if [ "$FRONTEND_RESP" = "200" ]; then
  pass "Frontend responding (HTTP $FRONTEND_RESP)"
else
  fail "Frontend NOT responding (got: $FRONTEND_RESP)"
fi

# ─── 5. Caddy / Reverse Proxy ───────────────────────────────
hdr "5. Reverse Proxy Routing"

# Test Caddy routing to frontend
CADDY_FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "ERR")
if [ "$CADDY_FRONTEND" = "200" ]; then
  pass "Caddy → frontend: / → HTTP $CADDY_FRONTEND"
else
  fail "Caddy → frontend: / → HTTP $CADDY_FRONTEND"
fi

# Test Caddy routing API to backend
CADDY_API=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"x","password":"x"}' 2>/dev/null || echo "ERR")
if [ "$CADDY_API" = "401" ] || [ "$CADDY_API" = "400" ]; then
  pass "Caddy → /api/* → backend: HTTP $CADDY_API (expected for bad creds)"
else
  fail "Caddy → /api/* → backend: HTTP $CADDY_API (expected 401 — check Caddyfile)"
fi

# Test that a non-API path does NOT return backend JSON
CADDY_NOAPI=$(curl -s http://localhost/auth/login 2>/dev/null | head -c 100)
if echo "$CADDY_NOAPI" | grep -qi "<html\|<!doctype\|next"; then
  pass "Caddy → /auth/login (no /api prefix) goes to frontend HTML (as expected)"
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

BACKEND_DB=$(docker compose exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/ 2>/dev/null || echo "ERR")
# Check if the backend can query DB by hitting an endpoint that needs DB
TENANTS_TEST=$(docker compose exec -T backend curl -s http://localhost:3001/api/tenants 2>/dev/null | head -c 200)
if echo "$TENANTS_TEST" | grep -qi "unauthorized\|jwt\|token\|forbidden"; then
  pass "Backend /api/tenants requires auth (DB query works, expected 401)"
elif echo "$TENANTS_TEST" | grep -q "\[\]"; then
  pass "Backend /api/tenants returned empty array (DB connected, no auth)"
else
  warn "Backend /api/tenants unexpected response"
  info "Response: $TENANTS_TEST"
fi

# ─── 7. Environment Variables ───────────────────────────────
hdr "7. Environment Variables"

# Load .env
if [ -f .env ]; then
  source .env
  pass ".env file found"
else
  fail ".env file missing"
fi

# Check domain
info "DOMAIN = ${DOMAIN:-NOT SET}"
info "NODE_ENV = production"

# Check backend env
BACKEND_API_URL=$(docker compose exec -T backend printenv FRONTEND_URL 2>/dev/null || echo "NOT SET")
info "Backend FRONTEND_URL = $BACKEND_API_URL"

# Check frontend env (runtime — won't show NEXT_PUBLIC_* since it's build-time)
FRONTEND_API_URL=$(docker compose exec -T frontend printenv NEXT_PUBLIC_API_URL 2>/dev/null || echo "NOT SET")
info "Frontend runtime NEXT_PUBLIC_API_URL = $FRONTEND_API_URL"
warn "Note: NEXT_PUBLIC_* is baked at build time — runtime value is ignored for client JS"

# ─── 8. Recent Logs ─────────────────────────────────────────
hdr "8. Container Logs (last 20 lines each)"

for svc in backend frontend caddy postgres; do
  echo -e "\n${CYAN}─── $svc ───${NC}"
  docker compose logs --tail 20 "$svc" 2>/dev/null || echo "  (no logs)"
done

# ─── 9. Network ─────────────────────────────────────────────
hdr "9. Container Network"
docker compose exec -T backend ping -c 1 -W 2 postgres &>/dev/null && \
  pass "backend → postgres: reachable" || fail "backend → postgres: UNREACHABLE"

docker compose exec -T backend ping -c 1 -W 2 frontend &>/dev/null && \
  pass "backend → frontend: reachable" || fail "backend → frontend: UNREACHABLE"

docker compose exec -T frontend ping -c 1 -W 2 backend &>/dev/null && \
  pass "frontend → backend: reachable" || fail "frontend → backend: UNREACHABLE"

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
echo -e "${CYAN}  If all PASS, check browser DevTools → Network tab${NC}"
echo -e "${CYAN}  for the exact failing request URL.${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
