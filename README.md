# point001

> **One point for everything.** An executive, macOS-grade personal dashboard and life management operating system. Engineered with a strict 4-color monochrome design system, fluid micro-interactions, and offline-first tactile precision.

---

## ⚡ Architecture Overview

```
                      ┌─────────────────────────────────┐
                      │         User / Browser          │
                      └────────────────┬────────────────┘
                                       │
                                       ▼ HTTPS
                      ┌─────────────────────────────────┐
                      │    Frontend SPA (Vercel CDN)    │
                      │   React 18 • Vite • Tailwind    │
                      └────────────────┬────────────────┘
                                       │
                                       ▼ REST API (JWT Bearer)
                      ┌─────────────────────────────────┐
                      │   Backend API (Render Service)  │
                      │      Node.js • Express • TS     │
                      └────────┬───────────────┬────────┘
                               │               │
        Prisma Client (Runtime)│               │Prisma Migrate (Deploy)
       Pooled Connection :5432 │               │Direct Connection :5432
                               ▼               ▼
                      ┌─────────────────────────────────┐
                      │    Neon Serverless PostgreSQL   │
                      │  PgBouncer Pooler • Direct Node │
                      └─────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Sonner |
| **Backend** | Node.js (ESM), Express, TypeScript, Prisma ORM 6.x |
| **Database** | Neon Serverless PostgreSQL (with connection pooling) |
| **Security** | JWT Authentication, AES-256-GCM Credential Encryption, Scoped CORS |
| **Integrations**| Google OAuth 2.0 (SSO, People API / Contacts), IMAP (Gmail Background Sync) |
| **Deployment** | Vercel (Client Edge SPA), Render (API Web Service), Neon (Database) |

---

## 🚀 Production Deployment Guide

Deploying **point001** to production takes less than 10 minutes using **Neon**, **Render**, and **Vercel**.

```
Step 1: Database (Neon)  ──>  Step 2: API (Render)  ──>  Step 3: Client (Vercel)
```

---

### Step 1: Provision Neon Serverless PostgreSQL

1. Go to [neon.tech](https://neon.tech) and create a new project named `point001`.
2. In the Neon Console Dashboard, navigate to **Connection Details**.
3. You need **two connection strings**:
   - **Pooled connection string** (keep "Connection pooling" checked):
     ```
     postgresql://user:pass@ep-xyz-pooler.region.aws.neon.tech/point001?sslmode=require
     ```
     *(This is your `DATABASE_URL` — used by Prisma Client at runtime for elastic connection handling)*
   - **Direct connection string** (uncheck "Connection pooling"):
     ```
     postgresql://user:pass@ep-xyz.region.aws.neon.tech/point001?sslmode=require
     ```
     *(This is your `DIRECT_URL` — used by Prisma Migrate during build to execute transactional DDL migrations)*

---

### Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com) and create a **New Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `point001-api`
   - **Region**: Choose the region closest to your Neon database (e.g. `Ohio (US East)`).
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build:render
     ```
     *(This automatically generates Prisma Client, runs all pending database migrations on Neon, and compiles TypeScript)*
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Health Check Path**: `/health`
4. Add the following **Environment Variables** in Render:

| Key | Example / Recommended Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production environment flag |
| `DATABASE_URL` | *Neon Pooled Connection String* | High-concurrency runtime queries |
| `DIRECT_URL` | *Neon Direct Connection String* | Schema migrations endpoint |
| `JWT_SECRET` | `openssl rand -base64 32` | 32+ character key for auth tokens |
| `ENCRYPTION_KEY` | `openssl rand -hex 16` | 32-character hex key for AES-256 |
| `CLIENT_URL` | `https://point001.vercel.app` | Allowed CORS origins (can be comma-separated) |
| `GOOGLE_CLIENT_ID` | `your_id.apps.googleusercontent.com` | Google OAuth Client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | `your_secret` | Google OAuth Client Secret (optional) |

5. Click **Create Web Service**. Once deployment finishes, copy your Render URL (e.g. `https://point001-api.onrender.com`).

---

### Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Root Directory**: Click edit and select `client`.
   - **Framework Preset**: `Vite` (automatically detected).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the following **Environment Variables** in Vercel:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://point001-api.onrender.com/api` | Your live Render backend URL |
| `VITE_GOOGLE_CLIENT_ID` | `your_id.apps.googleusercontent.com` | Google OAuth Client ID for SSO |

5. Click **Deploy**. Vercel will build the assets and deploy to its global edge network.

---

### Step 4: Configure Google OAuth (Optional)

If using Google SSO and Google Contacts sync:
1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Edit your **OAuth 2.0 Client ID**.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (local development)
   - `https://your-app.vercel.app` (production Vercel domain)
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:5173`
   - `https://your-app.vercel.app`
5. Save changes.

---

## 💻 Local Development Quickstart

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL database (local or Neon free tier)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/point001.git
cd point001

# Install both backend and frontend dependencies
npm run install:all
```

### 2. Configure Environment Files

**Backend (`server/.env`):**
```bash
cp server/.env.example server/.env
# Update DATABASE_URL and DIRECT_URL with your Postgres credentials
```

**Frontend (`client/.env`):**
```bash
cp client/.env.example client/.env
```

### 3. Initialize Database
```bash
npm run db:migrate
```

### 4. Start Development Servers
In separate terminals:
```bash
# Terminal 1: Backend API (http://localhost:5000)
npm run dev:server

# Terminal 2: Frontend App (http://localhost:5173)
npm run dev:client
```

---

## 🔍 Verification & Health Checks

Verify your production deployment at any time:

```bash
# Check Backend Health (Render)
curl -i https://point001-api.onrender.com/health

# Expected 200 OK Response:
# {
#   "status": "healthy",
#   "service": "point001-api",
#   "version": "1.0.0",
#   "environment": "production",
#   "timestamp": "2026-11-23T09:30:00.000Z",
#   "database": "connected"
# }
```

---

## 🎨 Design Philosophy: 4-Color Monochrome

**point001** is engineered under a strict monochrome constraint inspired by professional macOS desktop software:
- `--bg: #09090b` — Deep matte obsidian canvas
- `--surface: #131316` — Elevated container panels and cards
- `--surface-hover: #1b1b20` — Subtle interaction feedback
- `--border: #232329` — Crisp hair-line structural boundaries
- `--text: #f4f4f6` — High-contrast primary typographic tone
- `--text-muted: #73737c` — Secondary contextual metadata

Micro-interactions are intentional, calm, and uniform across all views:
- Fluid 240ms cubic-bezier directional page and calendar navigation.
- 280ms debounced hover action drawers on desktop with tap-popover fallback on mobile.
- Tactile spring check-pop micro-animations on habits and tasks.

---

## 📄 License
Private & Proprietary. All rights reserved.
