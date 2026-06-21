#!/bin/bash
# ============================================
# LedgerLite VPS Setup Script
# ============================================
# Run this on a fresh Ubuntu 22.04/24.04 VPS
# Usage: bash setup.sh
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[x]${NC} $1"; exit 1; }

# ─── Prerequisites Check ────────────────────────────────────

if [ "$EUID" -ne 0 ]; then err "Run as root: sudo bash setup.sh"; fi

# ─── 1. Install Docker ──────────────────────────────────────

if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker --now
else
  log "Docker already installed"
fi

if ! docker compose version &>/dev/null; then
  # Install Docker Compose plugin
  apt-get update -qq
  apt-get install -y -qq docker-compose-plugin
fi

log "Docker version: $(docker --version)"
log "Docker Compose version: $(docker compose version)"

# ─── 2. Install git if missing ──────────────────────────────

if ! command -v git &>/dev/null; then
  log "Installing git..."
  apt-get install -y -qq git
fi

# ─── 3. Clone or update repository ──────────────────────────

REPO_URL="${REPO_URL:-https://github.com/your-org/ledgerlite.git}"
APP_DIR="/opt/ledgerlite"

if [ -d "$APP_DIR/.git" ]; then
  log "Repository exists, pulling latest..."
  cd "$APP_DIR"
  git pull origin main
else
  log "Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

cd "$APP_DIR/vps"

# ─── 4. Configure environment ────────────────────────────────

if [ ! -f ".env" ]; then
  log "Creating .env from template..."
  cp .env.production .env

  # Generate random secrets
  DB_PASS=$(openssl rand -base64 32)
  JWT_SECRET=$(openssl rand -base64 64)

  sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASS/" .env
  sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env

  warn "Generated random DB_PASSWORD and JWT_SECRET"
  warn "EDIT .env and set your DOMAIN before continuing!"
  warn "  nano /opt/ledgerlite/vps/.env"
  warn "Then re-run this script."
  exit 0
fi

# ─── 5. Verify domain is set ────────────────────────────────

source .env
if [ "$DOMAIN" = "yourdomain.com" ] || [ -z "$DOMAIN" ]; then
  err "DOMAIN is not set in .env. Edit /opt/ledgerlite/vps/.env first."
fi

# ─── 6. Configure firewall ──────────────────────────────────

if command -v ufw &>/dev/null; then
  log "Configuring UFW firewall..."
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  echo "y" | ufw enable 2>/dev/null || true
  ufw status verbose
fi

# ─── 7. Start services ──────────────────────────────────────

log "Building and starting services..."
docker compose build
docker compose up -d

log "Waiting for PostgreSQL to be ready..."
sleep 10

# ─── 8. Run database migration ──────────────────────────────

log "Running database migration..."
docker compose exec -T backend npx prisma migrate deploy 2>&1 || warn "Migration may have already been applied"

# ─── 9. Seed demo data ─────────────────────────────────────

log "Seeding demo data..."
docker compose exec -T backend npx ts-node prisma/seed.ts 2>&1 || warn "Seed may have already run"
docker compose exec -T backend npx ts-node prisma/demo-seed.ts 2>&1 || warn "Demo seed may have already run"

# ─── 10. Set up automated backups ───────────────────────────

BACKUP_SCRIPT="/opt/ledgerlite/vps/backup.sh"
if [ -f "$BACKUP_SCRIPT" ]; then
  chmod +x "$BACKUP_SCRIPT"
  CRON_JOB="0 3 * * * $BACKUP_SCRIPT >> /var/log/ledgerlite-backup.log 2>&1"
  (crontab -l 2>/dev/null | grep -v "backup.sh"; echo "$CRON_JOB") | crontab -
  log "Automated daily backup scheduled at 3 AM"
fi

# ─── 11. Print summary ─────────────────────────────────────

log "============================================"
log "  LedgerLite deployment complete!"
log "============================================"
log "  URL:        https://$DOMAIN"
log "  Backups:    /opt/ledgerlite/backups/"
log "  Logs:       docker compose logs -f"
log "  Status:     docker compose ps"
log "============================================"
log "  Demo logins:"
log "    CA:       ca1@example.com / password123"
log "    Business: business1@example.com / password123"
log "============================================"
