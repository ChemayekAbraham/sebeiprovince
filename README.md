# Sebei Province Football Platform

**"The Home of Football in Sebei Province"**
*Your Region. Your Teams. Your Football.*

A modern, full-stack football media and tournament management system built for Sebei Province (Kapchorwa, Bukwo, and Kween). The system features a public-facing website and an authenticated admin console, powered by an Express/TypeScript backend with PostgreSQL.

---

## 🏗️ Architecture

```
sebei-province-football/
├── apps/
│   ├── api/        # Node.js + Express + TypeScript API + PostgreSQL
│   │   ├── src/
│   │   │   ├── schema.sql       # Normalized relational database schema
│   │   │   ├── db.ts            # PostgreSQL pool and transaction helpers
│   │   │   ├── auth.ts          # RBAC, secure sessions, audit logging, lockout protection
│   │   │   ├── standings.ts     # Dynamic league table recalculation engine
│   │   │   ├── public.ts        # Read-only public endpoints (news, fixtures, standings, etc.)
│   │   │   ├── admin.ts         # Authenticated admin management endpoints
│   │   │   ├── demo_seed.ts     # Regional sample data for Sebei clubs & leagues
│   │   │   └── tests/           # Integration test suite
│   ├── web/        # Public sports portal (Vite + React + Tailwind CSS)
│   │   └── port 5173
│   └── admin/      # Dedicated administration console (Vite + React + Tailwind CSS)
│       └── port 5174
├── uploads/        # Uploaded images, club logos, player portraits
└── package.json    # Monorepo workspaces configuration
```

---

## ⚡ Quick Start

### 1. Database & Migrations

Ensure PostgreSQL is running locally, then run:

```bash
# 1. Run migrations and seed roles, permissions & initial Super Admin
npm run migrate
npm run seed

# 2. (Optional) Populate authentic regional teams & matches:
npx tsx --env-file=.env apps/api/src/demo_seed.ts
```

### 2. Run the Platform

Start each app in separate terminals:

```bash
# Terminal 1: Backend API (port 4000)
npm run dev:api

# Terminal 2: Public Website (port 5173)
npm run dev:web

# Terminal 3: Admin Console (port 5174)
npm run dev:admin
```

---

## 🔑 Administrative Access

- **Admin URL:** `http://localhost:5174`
- **Default Super Admin:** `admin@sebeiprovincefootball.com`
- **Default Password:** `ChangeMe!12345`

---

## 🛡️ Key Features Implemented

1. **Brand Identity:** Deep Forest Green (`#14532D`, `#052E16`), Accent Gold (`#F5C542`), and clean responsive layouts.
2. **Public Website:**
   - Real-time breaking news banner (toggleable via admin settings).
   - Featured stories, latest news grid with category filters, and search dialog.
   - Live & upcoming fixtures, full-time match reports with scores.
   - Dynamic league standings with real-time points, goal difference, and positions.
   - Transfer Hub with verified moves and historical records.
   - Teams & Players directories with profiles, stadiums, and squad numbers.
3. **Admin Console:**
   - Role-Based Access Control (Super Admin, Administrator, Editor, Sports Data Manager, Transfer Manager).
   - Atomic Transfer Verification & Publication: verifying and publishing a transfer atomically updates the player's team affiliation and history table within a database transaction.
   - Match Result Entry: entering and publishing match scores automatically recalculates official standings.
   - Audit trail capturing timestamps, users, actions, and affected entity records.
4. **Automated Integration Tests:**
   Run tests via:
   ```bash
   npm test
   ```
