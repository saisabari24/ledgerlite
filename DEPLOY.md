# Deploy LedgerLite as a Demo

## Pre-Deployment Code Changes

### 1. Make CORS dynamic (already done)

`backend/src/main.ts` line 14 reads `process.env.FRONTEND_URL` — no changes needed. Just set `FRONTEND_URL` env var on the backend service to the frontend's deployed URL.

### 2. Create `backend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD npx prisma migrate deploy --schema=./prisma/schema.prisma \
    && node prisma/seed.js \
    && node dist/main.js
```

### 3. Database Migration on Startup

The backend startup command must run `prisma migrate deploy` before `node dist/main.js`. This can be done:

- **Option A** (recommended): In the Dockerfile CMD or platform's start command
- **Option B**: Use the platform's "pre-deploy" or "release" hook (Render has a "Build" vs "Start" phase, Railway has a build step)

### 4. File Upload Handling

Uploads currently use `multer.diskStorage` to `uploads/<tenantId>/` on the local filesystem. In cloud hosting, the filesystem is ephemeral (resets on restart). Options:

| Solution | Effort | Cost |
|----------|--------|------|
| **Persistent disk** — mount a volume on the host | Zero code changes | Free on Railway/Render |
| **Supabase Storage** — swap diskStorage for S3 | ~2 hours of code changes | Free tier (1GB) |
| **Cloudinary** — swap for Cloudinary upload | ~1 hour | Free tier (25GB) |

**For a demo, persistent volume is easiest.** Both Railway and Render support persistent disk volumes — just mount one at path `/app/uploads` and set `UPLOADS_DIR=/app/uploads`.

### 5. Seed for Demo

Create a one-off seed script or use the existing `prisma/seed.ts` run on deploy. The existing seed creates:
- 3 businesses with chart of accounts
- 2 CAs with access to all 3
- 8 print templates per tenant
- 5 inventory items per tenant
- 2 customers and 2 suppliers per tenant

**For a demo**, add a few more sample journal entries and stock movements so the screens look populated. Create a separate file `prisma/demo-seed.ts` that runs after the main seed.

---

## Deployment: Railway.app (Lowest Effort)

### Architecture

```
┌─────────────────┐    ┌─────────────────┐
│  PostgreSQL      │    │  Frontend        │
│  (Railway)       │    │  (Railway)       │
│                  │    │  Next.js         │
└────────┬─────────┘    │  port 3000       │
         │              └────────┬─────────┘
         │                       │ calls API
         │              ┌────────▼─────────┐
         └──────────────►  Backend          │
                        │  (Railway)        │
                        │  NestJS           │
                        │  port 3001        │
                        └──────────────────┘
```

### Step-by-Step

**Step 1 — Push to GitHub**

Push your repo to a public or private GitHub repository.

**Step 2 — Create Railway Project**

1. Go to [railway.app](https://railway.app) → Sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your repository

**Step 3 — Add PostgreSQL**

1. In your project, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway auto-provisions the database and creates a `DATABASE_URL` variable
3. The variable is auto-injected into all services in the project

**Step 4 — Deploy Backend**

1. Click **"+ New"** → **"Web Service"** 
2. Select the same GitHub repo
3. Configure the web service:

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `npm install && npm run db:generate && npm run build` |
| Start Command | `npx prisma migrate deploy --schema=./prisma/schema.prisma && npx ts-node prisma/seed.ts && node dist/main.js` |
| Service Name | `ledgerlite-backend` |

4. Add environment variables:

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | Generate a random 64-char string |
| `FRONTEND_URL` | `(leave empty, fill after frontend is deployed)` |
| `UPLOADS_DIR` | `/app/uploads` |
| `NODE_ENV` | `production` |

5. **Mount a persistent volume** (for file uploads):
   - Go to service settings → "Volumes" → Add volume
   - Mount path: `/app/uploads`
   - Size: 1 GB

**Step 5 — Deploy Frontend**

1. Click **"+ New"** → **"Web Service"**
2. Select the same GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start` |
| Service Name | `ledgerlite-frontend` |

4. Add environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `(Railway backend URL, e.g., https://ledgerlite-backend.railway.app)` |

**Step 6 — Wire Up URLs**

1. After both services deploy, copy the frontend's Railway URL
2. Go to the backend service settings → Add/Edit `FRONTEND_URL` variable → paste the frontend URL
3. Redeploy the backend (Railway auto-restarts on env change)

**Step 7 — Generate Demo Data**

1. Open a Railway CLI shell to the backend: `railway shell --service ledgerlite-backend`
2. Run: `npx ts-node prisma/demo-seed.ts` (after creating demo seed)

**Step 8 — Share**

Open the frontend Railway URL. Login credentials:
- CA: `ca1@example.com` / `password123`
- Business: `business1@example.com` / `password123`

---

## Deployment: Render.com (More Control)

### Architecture

```
┌─────────────────────────────────────────────┐
│  Render                                      │
│                                              │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ PostgreSQL   │  │  Web Service         │  │
│  │ (Managed)    │◄─│  NestJS backend      │  │
│  │ $7/mo        │  │  Root: backend/      │  │
│  └─────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Vercel (free tier)                         │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Next.js frontend                    │   │
│  │  Root: frontend/                     │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Backend on Render

1. Create a **PostgreSQL database** on Render (Free tier, expires after 90 days)
2. Create a **Web Service**:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run db:generate && npm run build`
   - Start Command: `npx prisma migrate deploy --schema=./prisma/schema.prisma && npx ts-node prisma/seed.ts && node dist/main.js`
3. Set environment variables (same as Railway, plus `UPLOADS_DIR=/opt/render/project/uploads`)
4. Add a **persistent disk** (1GB) mounted at `/opt/render/project/uploads`

### Frontend on Vercel

1. Import GitHub repo into Vercel
2. Set Root Directory to `frontend`
3. Set Framework Preset to `Next.js`
4. Add environment: `NEXT_PUBLIC_API_URL=https://ledgerlite-backend.onrender.com`
5. Deploy

---

## Deployment: Single VPS (Budget Option)

### On a $6/month DigitalOcean Droplet or Hetzner VPS

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Clone repo
git clone https://github.com/yourorg/ledgerlite.git
cd ledgerlite

# 3. Create docker-compose.prod.yml
cat > docker-compose.prod.yml << 'EOF'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ledgerlite
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ledgerlite
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://ledgerlite:${DB_PASSWORD}@postgres:5432/ledgerlite
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: https://${DOMAIN}
      UPLOADS_DIR: /app/uploads
      PORT: 3001
    volumes:
      - uploads:/app/uploads
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: https://api.${DOMAIN}
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - certs:/etc/letsencrypt
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  pg_data:
  uploads:
  certs:
EOF

# 4. Set up DNS + SSL with Certbot or Caddy
# 5. docker compose -f docker-compose.prod.yml up -d
```

---

## Demo Data Enhancement

Create `backend/prisma/demo-seed.ts` to add realistic-looking data:

```typescript
// Add sample journal entries, sales invoices, payments etc.
// Run once after main seed: npx ts-node prisma/demo-seed.ts
```

This makes the demo screens look alive with data rather than empty tables.

---

## Checklist Before Sharing Demo

- [ ] Disable registration or add rate-limiting (so randoms don't spam-sign up)
- [ ] Set a strong `JWT_SECRET` (64+ random chars)
- [ ] Run seed to populate demo accounts, items, customers, suppliers
- [ ] Test login with both CA and Business roles
- [ ] Test journal entry creation → posting → cancellation
- [ ] Test stock movement creation → posting
- [ ] Test sales invoice → posting (check journal entry was created)
- [ ] Test sales payment → posting (check invoice status updates)
- [ ] Test logo upload in Settings
- [ ] Test print template editor and preview
- [ ] Test all 8 sales/purchase screens load real data
- [ ] If using Railway/Render without persistent disk, uploads WILL reset on restart — communicate this
- [ ] Set up a custom domain (optional, Railway/Render/Vercel provide free `.onrailway.app` / `.onrender.com` / `.vercel.app` domains)

---

## Cost Comparison

| Platform | Services | Monthly Cost |
|----------|----------|-------------|
| **Railway (all-in-one)** | BE + FE + Postgres | ~$0–7 (usage-based) |
| **Render + Vercel** | Render BE + Postgres + Vercel FE | ~$7/mo |
| **DigitalOcean Droplet** | 1 VPS (everything) | $6/mo |
| **Hetzner VPS** | 1 VPS (everything) | ~€4/mo |

---

## Demo Credentials

| Role | Email | Password | Tenants |
|------|-------|----------|---------|
| CA | `ca1@example.com` | `password123` | All 3 businesses |
| CA | `ca2@example.com` | `password123` | All 3 businesses |
| Business | `business1@example.com` | `password123` | ABC Pvt Ltd |
| Business | `business2@example.com` | `password123` | TechNova LLP |
| Business | `business3@example.com` | `password123` | Zenith Industries |
