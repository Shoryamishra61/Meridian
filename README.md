<div align="center">

# Meridian

### Enterprise Performance Management Platform

**Goal Setting · Quarterly Check-ins · Analytics · Escalations**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript)](https://typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Live Demo →](#live-demo) · [Architecture →](#system-architecture) · [Quick Start →](#quick-start)

</div>

---

## Overview

**Meridian** is a production-grade performance management platform that replaces spreadsheet chaos, email bottlenecks, and offline review cycles with a structured, digital goal-setting and tracking portal. It supports the full lifecycle of employee goals — from creation and alignment to quarterly check-ins, manager approvals, and executive analytics — while being intuitive, reliable, and audit-ready.

Built with a **microservice-ready monolith** architecture, Meridian is designed to scale from a 50-person startup to a 10,000+ employee enterprise without architectural rewrites.

---

## Live Demo

| | |
|---|---|
| **Portal URL** | _`[To be added after Vercel deployment]`_ |
| **GitHub Repository** | [github.com/Shoryamishra61/Meridian](https://github.com/Shoryamishra61/Meridian) |

### Demo Credentials

Use the **quick-login buttons** on the login screen, or enter credentials manually:

| Role | Name | Email | Password |
|------|------|-------|----------|
| **Employee** | Priya Nair | `priya@meridian.app` | `Demo@2024` |
| **Manager** | Arjun Mehta | `arjun@meridian.app` | `Demo@2024` |
| **Admin / HR** | Kavya Deshmukh | `kavya@meridian.app` | `Demo@2024` |

> **Tip:** Use the built-in **Role Switcher** in the sidebar to instantly switch between personas without logging out. The **Demo Date** picker lets you simulate different quarters for check-in schedules.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │   Next.js 16     │  │   React 19 SPA   │  │  Teams Adaptive  │      │
│  │   App Router     │  │   + TypeScript   │  │  Card Preview    │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
└───────────┼──────────────────────┼──────────────────────┼───────────────┘
            │                      │                      │
┌───────────▼──────────────────────▼──────────────────────▼───────────────┐
│                      EDGE & API GATEWAY                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │   Vercel CDN     │  │   Middleware      │  │   Rate Limiter   │      │
│  │   Static + ISR   │  │   Auth + RBAC    │  │   + Idempotency  │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
└───────────┼──────────────────────┼──────────────────────┼───────────────┘
            │                      │                      │
┌───────────▼──────────────────────▼──────────────────────▼───────────────┐
│                      APPLICATION CORE                                   │
│                                                                         │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │
│  │ Goal Management│ │   Escalation   │ │  Notification  │              │
│  │    Service     │ │    Engine      │ │    Service     │              │
│  │                │ │                │ │                │              │
│  │ • CRUD + Lock  │ │ • 3 Rules      │ │ • In-App       │              │
│  │ • Shared Goals │ │ • L1/L2 Chain  │ │ • Email Queue  │              │
│  │ • Approval WF  │ │ • On-Demand    │ │ • Teams Cards  │              │
│  │ • Weightage    │ │   Scan         │ │ • Deep Links   │              │
│  └───────┬────────┘ └───────┬────────┘ └───────┬────────┘              │
│          │                  │                   │                       │
│  ┌───────▼──────────────────▼───────────────────▼────────┐             │
│  │              Zod Validation Layer                      │             │
│  │  Schema enforcement · Business rule guards · UoM math  │             │
│  └───────────────────────────┬────────────────────────────┘             │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                      DATA & STATE LAYER                                  │
│                                                                          │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐               │
│  │ Zustand Store  │ │   PostgreSQL   │ │   Redis Cache  │               │
│  │ (Demo Mode)    │ │   (Prisma ORM) │ │   (Production) │               │
│  │                │ │                │ │                │               │
│  │ • Persisted    │ │ • Full Schema  │ │ • Session TTL  │               │
│  │ • Seed Data    │ │ • Migrations   │ │ • Graph Cache  │               │
│  │ • Zero Cost    │ │ • Audit Trail  │ │ • Rate Limits  │               │
│  └────────────────┘ └────────────────┘ └────────────────┘               │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                      ANALYTICS & AUDIT                                   │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐               │
│  │  Calculation   │ │  Immutable     │ │  8 Analytics   │               │
│  │  Engine        │ │  Audit Trail   │ │  Panels        │               │
│  │  (4 UoM types) │ │  (Stripe-style)│ │  (Recharts)    │               │
│  └────────────────┘ └────────────────┘ └────────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Zod Validation → Zustand Mutation → Audit Log → UI Update
                                    │
                                    ├── Notification Dispatch
                                    └── Escalation Check (if applicable)
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 16 (App Router) | SSR + SPA + API routes in a single deployment unit |
| **Language** | TypeScript (strict mode) | End-to-end type safety across the stack |
| **UI** | React 19 + Tailwind CSS 4 | Component-driven architecture with design tokens |
| **State** | Zustand + persisted stores | Lightweight, performant, zero-latency reads |
| **Validation** | Zod v4 | Runtime schema enforcement at every API boundary |
| **Auth** | Auth.js + Microsoft Entra ID | Enterprise SSO with demo role-switcher fallback |
| **Database** | Prisma ORM → PostgreSQL | Production-ready schema with migrations |
| **Charts** | Recharts 3 | Lightweight, composable, React-native charting |
| **Notifications** | Sonner toasts + in-app inbox | Real-time feedback with deep-link navigation |
| **Exports** | SheetJS | Client-side CSV/Excel generation ($0 compute) |
| **Hosting** | Vercel (serverless + edge) | Global CDN, auto-scaling, zero-config deploys |

---

## Features

### Core Platform (Phase 1 & 2)

| Feature | Description |
|---------|-------------|
| **Goal Creation** | Structured wizard with Thrust Area, Title, UoM, Target, Weightage |
| **Business Rules** | Enforced: weightage = 100%, min 10%/goal, max 8 goals/cycle |
| **Manager Approval** | Approve / Return for Rework workflow with structured feedback |
| **Goal Locking** | Post-approval freeze — edits require Admin unlock |
| **Shared Goals** | Push departmental KPIs to teams with achievement sync |
| **Quarterly Check-ins** | Q1–Q4 actual vs. planned tracking with UoM formulas |
| **UoM Engine** | Min, Max, Timeline, Zero-based — all 4 calculation types |
| **Achievement Reports** | Export CSV/Excel with department-level roll-ups |
| **Audit Trail** | Immutable change log: entity, field, old→new, actor, timestamp |

### Enterprise Integrations

| Feature | Description |
|---------|-------------|
| **Microsoft Entra ID** | Auth.js provider with tenant-restricted issuer validation |
| **Microsoft Graph** | Org hierarchy sync client with token caching |
| **Email Notifications** | Event queue for submissions, approvals, returns, reminders |
| **Teams Adaptive Cards** | JSON card generation with deep-link navigation |
| **Escalation Engine** | 3 configurable rules with L1/L2 chain escalation |

### Analytics Module

8 interactive panels powered by Recharts:

- Department Score Heatmap
- Quarter-over-Quarter Trends
- Goal Completion Ring
- Check-in Completion Tracker
- Planned vs. Actual Bar Chart
- Thrust Area Radar
- Score vs. Target Gauge
- Check-in Timeline

### Bonus Features

- **AI Goal Suggestions** — Smart defaults per role and thrust area
- **Demo Date Override** — Simulate any quarter during presentations
- **Role Switcher** — Instant persona switch without re-login
- **Dark Mode** — Full theme support with semantic design tokens
- **Gamification** — Achievement badges with progress tracking

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm** 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/Shoryamishra61/Meridian.git
cd Meridian

# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
# http://localhost:3000
```

### Production Build

```bash
# Run full quality gates
npm run lint && npm run typecheck && npm run build

# Start production server
npm start
```

---

## Project Structure

```
meridian/
├── prisma/                      # Database schema & migrations
│   └── schema.prisma            # PostgreSQL-ready data model (15 tables)
├── src/
│   ├── app/
│   │   ├── (portal)/            # Authenticated portal routes
│   │   │   ├── dashboard/       # Role-adaptive dashboards (Employee/Manager/Admin)
│   │   │   ├── goals/           # Goal creation & management
│   │   │   ├── team/            # Manager team review
│   │   │   ├── checkins/        # Quarterly check-in flows
│   │   │   ├── analytics/       # 8-panel analytics dashboard
│   │   │   ├── reports/         # Achievement report exports
│   │   │   └── admin/           # Admin modules
│   │   │       ├── shared-goals/    # Departmental KPI push
│   │   │       ├── audit/           # Immutable audit trail viewer
│   │   │       ├── integrations/    # Entra ID, Email, Teams
│   │   │       ├── escalations/     # Rule-based escalation engine
│   │   │       └── cycles/          # Cycle management & unlock
│   │   ├── api/                 # Serverless API routes
│   │   │   ├── goal-sheets/     # Zod-validated goal API
│   │   │   ├── health/          # Health check endpoint
│   │   │   └── integrations/    # Teams card generation
│   │   └── layout.tsx           # Root layout with theme provider
│   ├── components/
│   │   ├── analytics/           # Chart panels & computation helpers
│   │   ├── goals/               # GoalCreateDialog, WeightageTracker
│   │   ├── layout/              # Sidebar, navigation, role switcher
│   │   └── ui/                  # Shared UI components
│   ├── lib/                     # Shared utilities
│   │   ├── ai-engine.ts         # AI goal suggestion engine
│   │   ├── calculations.ts      # UoM progress formulas
│   │   ├── constants.ts         # Business rules & demo accounts
│   │   ├── validations.ts       # Zod schemas
│   │   └── utils.ts             # Formatting helpers
│   ├── server/                  # Server-side domain logic
│   │   ├── auth/                # RBAC & session helpers
│   │   ├── config/              # Environment readiness checks
│   │   ├── domain/              # Goal policy enforcement
│   │   ├── http/                # Rate limiting & idempotency
│   │   └── integrations/        # Teams + Microsoft Graph clients
│   ├── stores/                  # Zustand state stores
│   │   ├── auth-store.ts        # Authentication state
│   │   ├── data-store.ts        # Core domain data
│   │   ├── demo-date-store.ts   # Demo date override
│   │   └── seed-data-extended.ts # Realistic demo data
│   └── types/                   # TypeScript definitions
├── tests/                       # Test suites (Vitest + Playwright)
├── scripts/                     # Quality gates & smoke tests
└── docs/                        # Architecture & evaluation docs
```

---

## Cost Optimization

| Strategy | Implementation | Monthly Cost |
|----------|---------------|-------------|
| Serverless hosting | Vercel free tier | **$0** |
| Client-side state | Zustand (zero DB hosting) | **$0** |
| Client-side exports | SheetJS in-browser | **$0** |
| Edge caching | Vercel CDN (sub-50ms TTFB) | **$0** |
| Zero external APIs | Self-contained demo data | **$0** |

**Demo mode total: $0/month**

### Production Scaling Path

| Tier | Stack Addition | Cost |
|------|---------------|------|
| PostgreSQL | Supabase managed DB | ~$25/mo |
| Session Cache | Upstash Redis | ~$10/mo |
| Team Features | Vercel Pro | ~$20/mo |
| **Total** | **500+ concurrent users** | **~$55/mo** |

---

## Security & Production Hardening

- **Middleware**: Security headers, request IDs, auth guards on every route
- **Idempotency**: `ApiIdempotencyKey` prevents double-submits on critical operations
- **Outbox Pattern**: `OutboxEvent` decouples email/Teams delivery from user transactions
- **Optimistic Locking**: `version` columns on mutable records prevent write conflicts
- **Input Sanitization**: Zod schemas + HTML sanitization at every API boundary
- **RBAC**: Role-based access control enforced at middleware, API, and UI layers

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | Full system design with Mermaid diagrams |
| [Production Readiness](docs/PRODUCTION_READINESS.md) | Deployment checklist & scaling guide |
| [Evaluation Matrix](docs/EVALUATION_MATRIX.md) | Feature coverage vs. requirements |

---

<div align="center">

**Built with precision for AtomQuest Hackathon 1.0 · May 2026**

*Meridian — Where performance meets clarity.*

</div>
