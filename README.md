# Meridian — Goal Setting & Tracking Portal

**AtomQuest Hackathon 1.0** · Enterprise-grade performance management for modern organizations.

---

## Overview

Meridian is a structured, digital Goal Setting & Tracking Portal that eliminates spreadsheet chaos, email bottlenecks, and offline review cycles. It supports the full lifecycle of employee goals — from creation and alignment to quarterly check-ins and performance visibility — while being intuitive, reliable, and audit-ready.

## Demo Credentials

Use the demo account buttons on the login screen, then use the built-in **Role Switcher** in the sidebar to move between personas during the pitch.

| Persona | Email | Role | Department |
|---------|-------|------|------------|
| Priya Nair | priya@meridian.app | Employee | Sales & BD |
| Arjun Mehta | arjun@meridian.app | Manager (L1) | Sales & BD |
| Kavya Deshmukh | kavya@meridian.app | Admin / HR | HR & Admin |

Password for all demo accounts: `Demo@2024`

> The **Demo Date** picker in the sidebar lets you simulate different quarters for the check-in schedule.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| State Management | Zustand persisted stores |
| Validation | Zod (API-level schema enforcement) |
| Auth | Auth.js with Microsoft Entra ID provider |
| Database | Prisma schema for PostgreSQL deployment |
| Charts | Recharts |
| Notifications | Sonner |
| Exports | SheetJS (client-side CSV/Excel) |
| Styling | Pure inline styles (design system) |
| Hosting | Vercel (serverless) |

---

## How to Run Locally

```bash
# Clone the repository
git clone https://github.com/YOUR_REPO/meridian.git
cd meridian

# Install dependencies
npm install

# Start development server
npm run dev

# Production quality gates
npm run test:production-gates

# Open in browser
# http://localhost:3000
```

**Requirements:** Node.js 18+ and npm 9+.

---

## Project Structure

```
meridian/
├── docs/                    # Architecture diagram & docs
│   └── ARCHITECTURE.md      # Full system design document
├── src/
│   ├── app/
│   │   ├── (portal)/        # All portal pages
│   │   │   ├── dashboard/   # Manager dashboard
│   │   │   ├── goals/       # Employee goal creation
│   │   │   ├── team/        # Manager team review
│   │   │   ├── checkins/    # Quarterly check-ins
│   │   │   ├── analytics/   # 8-panel analytics dashboard
│   │   │   ├── reports/     # Achievement report exports
│   │   │   └── admin/       # Admin modules
│   │   │       ├── shared-goals/  # Departmental KPI push
│   │   │       ├── audit/         # Immutable audit trail
│   │   │       ├── integrations/  # Entra, email, Teams evidence
│   │   │       ├── escalations/   # Rule-based escalations
│   │   │       └── cycles/        # Cycle settings & unlock
│   │   ├── api/             # Serverless API routes
│   │   │   ├── goal-sheets/ # Zod-validated goal API
│   │   │   ├── health/      # Health check endpoint
│   │   │   └── integrations/# Teams card generation
│   │   └── layout.tsx       # Root layout
│   ├── components/          # Reusable UI components
│   │   ├── analytics/       # Chart panels & shared helpers
│   │   ├── goals/           # GoalCreateDialog, WeightageTracker
│   │   └── layout/          # Sidebar navigation
│   ├── lib/                 # Shared utilities
│   │   ├── calculations.ts  # UoM progress formulas
│   │   ├── constants.ts     # Business rules & demo accounts
│   │   ├── utils.ts         # Formatting helpers
│   │   └── validations.ts   # Zod schemas
│   ├── server/              # Server-side domain logic
│   │   ├── auth/            # RBAC/session helpers
│   │   ├── config/          # Environment readiness checks
│   │   ├── domain/          # Goal policy enforcement
│   │   ├── http/            # Rate limiting/idempotency helpers
│   │   └── integrations/    # Teams + Microsoft Graph clients
│   ├── stores/              # Zustand state stores
│   │   ├── auth-store.ts    # Authentication state
│   │   ├── data-store.ts    # Core data (goals, sheets, audit)
│   │   └── demo-date-store.ts # Demo date override
│   └── types/               # TypeScript type definitions
└── package.json
```

---

## Features Implemented

### Must-Have (BRD Phase 1 & 2)
- ✅ Goal creation with Thrust Area, Title, UoM, Target, Weightage
- ✅ Validation: weightage = 100%, min 10% per goal, max 8 goals
- ✅ Manager approval workflow (Approve / Return for Rework)
- ✅ Goal locking on approval — no employee edits without Admin unlock
- ✅ Shared Goals — push departmental KPIs with achievement sync
- ✅ Quarterly check-ins (Q1-Q4) with actual vs planned tracking
- ✅ UoM formulas: Min, Max, Timeline, Zero-based (all 4 types)
- ✅ Manager check-in comments (structured feedback)
- ✅ Achievement report export (CSV + Excel)
- ✅ Real-time completion dashboard
- ✅ Full audit trail (post-lock change logging)

### Good-to-Have (BRD §5)
- ✅ Microsoft Entra ID Auth.js integration path + demo SSO fallback
- ✅ Microsoft Graph org hierarchy sync client + readiness API
- ✅ Email notification event queue for submissions, approvals, returns, reminders, and escalations
- ✅ Teams Adaptive Card notification preview + JSON generation
- ✅ Rule-based escalation engine (3 rules, L1/L2 chain)
- ✅ Analytics module (8 interactive panels with insight cards)

### Bonus Differentiators
- ✅ AI Goal Suggestions (smart defaults per role/thrust area)
- ✅ Demo Date Override (simulate any quarter during presentation)
- ✅ Role switcher (instant persona switch, no re-login)
- ✅ Pre-seeded demo data with realistic narrative

---

## Cost Optimization

| Strategy | Impact |
|----------|--------|
| Serverless hosting | Low idle cost |
| Postgres-ready Prisma schema | No rewrite from demo to production |
| Client-side exports (SheetJS) | $0 compute for reports |
| Edge CDN/static assets | Low latency, fewer server invocations |
| Graph token caching | Fewer Microsoft API calls |
| Outbox notifications | Reliable retries without blocking user flows |

For hackathon demo mode, Meridian can still run at near-zero cost with local persisted data. For deployment, see [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architecture details and production scaling path.

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete system design with Mermaid diagrams covering:
- High-level architecture (5 layers)
- Service decomposition
- Data model (ERD)
- Request lifecycle (sequence diagram)
- Cost optimization strategy
- Evaluation criteria mapping

---

*Built for AtomQuest Hackathon 1.0 · May 2026*
