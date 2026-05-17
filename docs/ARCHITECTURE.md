# Meridian — System Architecture Document
**AtomQuest Hackathon 1.0 · Goal Setting & Tracking Portal**
**Version 1.0 · May 2026**

---

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph CLIENT["Client & Presentation Layer"]
        SPA["Next.js 16 App Router<br/>React 19 + TypeScript"]
        TEAMS["Teams Adaptive Cards<br/>JSON Generation API"]
    end

    subgraph EDGE["Vercel Edge Network"]
        CDN["Global CDN<br/>Static Assets + ISR"]
        APIGW["API Routes<br/>Serverless Functions"]
        MW["Middleware<br/>Auth + Rate Limiting"]
    end

    subgraph CORE["Application Core"]
        GOAL["Goal Management<br/>Service"]
        ESC["Escalation &<br/>Rule Engine"]
        NOTIF["Notification<br/>Service"]
        AUTH["Auth.js + Entra<br/>Role Resolution"]
    end

    subgraph DATA["Data & State Layer"]
        ZUSTAND["Zustand Store<br/>Demo State"]
        PG["PostgreSQL<br/>Prisma Schema"]
        ZOD["Zod Validation<br/>Schema Enforcement"]
        SEED["Demo Seed Data<br/>Pre-loaded Accounts"]
    end

    subgraph ANALYTICS["Analytics & Audit"]
        CALC["Calculation Engine<br/>UoM Formulas"]
        AUDIT["Immutable Audit<br/>Trail Logger"]
        PANELS["8 Analytics Panels<br/>Recharts Visualizations"]
    end

    SPA --> CDN
    SPA --> APIGW
    TEAMS --> APIGW
    CDN --> MW
    APIGW --> MW
    MW --> AUTH
    AUTH --> GOAL
    AUTH --> ESC
    AUTH --> NOTIF
    GOAL --> ZUSTAND
    GOAL --> PG
    GOAL --> ZOD
    ESC --> ZUSTAND
    NOTIF --> ZUSTAND
    ZUSTAND --> SEED
    GOAL --> CALC
    GOAL --> AUDIT
    CALC --> PANELS
```

---

## 2. Layer-by-Layer Architecture Mapping

### Layer 1: Client & Presentation

| Spec Requirement | Meridian Implementation |
|---|---|
| Responsive SPA (React/Vue/Angular) | **Next.js 15 App Router** + React 19 + TypeScript |
| Role-based views | Sidebar adapts per role (Employee/Manager/Admin) |
| Teams Adaptive Cards | `/api/integrations/teams-card` generates JSON payloads |
| Deep-link support | URL params route to specific goal sheets |

**Key Design Decision:** Next.js App Router provides both SSR for SEO and client-side navigation for SPA feel. Zero page reloads during role-switching.

### Layer 2: API Gateway & Authentication

| Spec Requirement | Meridian Implementation |
|---|---|
| API Gateway + rate limiting | **Vercel Edge Network** handles routing, SSL, and rate limiting |
| Entra ID SSO | **Auth.js Microsoft Entra ID provider** plus demo role switcher fallback |
| Role mapping from groups | Entra app roles or group-object-id mapping |
| L4 Load Balancer | **Vercel auto-scaling** serverless functions |

**Key Design Decision:** Demo mode keeps the pitch frictionless, while production mode uses `/api/auth/[...nextauth]`, tenant-restricted issuer settings, JWT sessions, and server-side role resolution.

### Layer 3: Application Core

```mermaid
graph LR
    subgraph GOAL_SVC["Goal Management Service"]
        CREATE["Goal Creation<br/>Wizard"]
        VALID["Validation Engine<br/>100% weight · 10% min · 8 max"]
        LOCK["Lock Manager<br/>Post-approval freeze"]
        SHARE["Shared Goal<br/>Sync Engine"]
    end

    subgraph ESC_SVC["Escalation Engine"]
        RULES["3 Configurable Rules"]
        SCAN["On-Demand Scan<br/>Simulates CRON"]
        LOG["Escalation Log<br/>L1/L2 Chain"]
    end

    subgraph NOTIF_SVC["Notification Service"]
        INAPP["In-App<br/>Notification Store"]
        CARD["Teams Card<br/>JSON Builder"]
        DEEP["Deep-Link<br/>Generator"]
    end

    CREATE --> VALID
    VALID --> LOCK
    LOCK --> SHARE
    SCAN --> RULES
    RULES --> LOG
    LOG --> INAPP
    INAPP --> CARD
    CARD --> DEEP
```

| Service | Spec Pattern | Meridian Implementation |
|---|---|---|
| Goal Management | Idempotent APIs (Stripe pattern) | Zustand actions with dedup guards — `getOrCreateSheet()` is idempotent |
| Validation | Server-side enforcement | **Dual layer**: Client-side (WeightageTracker) + Server API (`/api/goal-sheets/validate` with Zod) |
| Escalation Engine | Background CRON workers | `runEscalationScan()` — on-demand trigger (simulates CRON for demo) |
| Notification Service | Event-driven (Kafka/SQS) | `addNotification()` — synchronous in-memory (no message broker needed at demo scale) |

**Idempotency Pattern:**
```
getOrCreateSheet(userId, cycleId)
  → Check if sheet exists → Return existing
  → If not → Create new → Return new
  // Double-clicks safe: same input = same output
```

### Layer 4: Data & State Layer

| Spec Requirement | Meridian Implementation |
|---|---|
| PostgreSQL primary DB | Prisma schema with governance constraints and production hardening migration |
| Redis caching | Recommended for high-scale sessions, Graph hierarchy cache, and rate limits |
| TTL eviction | Idempotency keys and Graph sync cache expire by policy |
| Thundering Herd protection | Background outbox, token caching, and async report generation |

**Why Demo Mode Works for Hackathon:**
- Zero infrastructure cost ($0/month)
- Instant reads (no network latency)
- Fully self-contained demo (no external dependencies)
- Same data model as PostgreSQL would use

**Data Model (mirrors production DB schema):**

```mermaid
erDiagram
    USERS ||--o{ GOAL_SHEETS : "creates"
    USERS ||--o{ GOALS : "owns"
    USERS ||--o{ CHECK_INS : "submits"
    GOAL_SHEETS ||--o{ GOALS : "contains"
    GOALS ||--o{ CHECK_INS : "tracked_by"
    USERS ||--o{ AUDIT_LOGS : "triggers"
    USERS ||--o{ ESCALATION_EVENTS : "targeted"
    USERS ||--o{ NOTIFICATIONS : "receives"
    CYCLES ||--o{ GOAL_SHEETS : "belongs_to"

    USERS {
        string id PK
        string name
        string email
        string role
        string department
        string managerId FK
    }

    GOAL_SHEETS {
        string id PK
        string employeeId FK
        string cycleId FK
        string status
        datetime submittedAt
        datetime approvedAt
        datetime lockedAt
    }

    GOALS {
        string id PK
        string sheetId FK
        string title
        string description
        string thrustAreaId
        string uomType
        number target
        number weightage
        number displayOrder
        boolean isShared
        string primaryOwnerId
    }

    CHECK_INS {
        string id PK
        string goalId FK
        string quarter
        number actual
        string status
        string comment
        string managerComment
    }

    AUDIT_LOGS {
        string id PK
        string entityType
        string entityId
        string action
        string fieldName
        json oldValue
        json newValue
        string changedBy FK
        datetime changedAt
    }
```

### Layer 5: Analytics & Audit

| Spec Requirement | Meridian Implementation |
|---|---|
| Canonical Log Lines (Stripe) | **Structured audit log** — entityType, action, oldValue→newValue, actor, timestamp |
| Read-replica for analytics | **Client-side computed** — Zustand selectors aggregate on-the-fly |
| QoQ trends, heatmaps, dashboards | **8 analytics panels** with Recharts visualizations |

**Analytics Computation Pattern:**
```
Zustand Store (source of truth)
  → Selector: filter by quarter/dept
  → Compute: calculateProgressScore() per goal
  → Aggregate: GROUP BY department, quarter
  → Render: Recharts LineChart/BarChart
```

No separate analytics DB needed — the full dataset fits in memory for demo scale.

---

## 3. Request Lifecycle

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant N as Next.js App
    participant Z as Zustand Store
    participant V as Validation (Zod)
    participant A as Audit Logger

    U->>N: Create Goal (title, UoM, target, weight)
    N->>V: Validate (Zod schema)
    V-->>N: ✅ Valid / ❌ Error
    alt Validation Failed
        N-->>U: Toast error with helpful message
    else Validation Passed
        N->>Z: addGoal(goalData)
        Z->>Z: Immer produce (immutable update)
        Z-->>N: Updated state
        N-->>U: Optimistic UI update (instant)
    end

    U->>N: Submit Goal Sheet
    N->>V: validateGoalSheetForSubmission()
    V->>V: Check: weight=100%, each≥10%, count≤8
    V-->>N: Result
    N->>Z: updateSheetStatus("PENDING_APPROVAL")
    N->>A: addAuditLog(SUBMIT, sheet, user)
    N->>Z: addNotification(manager, "New submission")
    Z-->>U: UI reflects submitted state
```

---

## 4. Cost Optimization Strategy

| Strategy | Implementation | Cost Impact |
|---|---|---|
| **Serverless hosting** | Vercel free tier | $0/month |
| **Client-side state** | Zustand (no DB) | $0/month (no DB hosting) |
| **Client-side exports** | SheetJS in-browser | $0 compute (no server PDF/Excel gen) |
| **Static generation** | Next.js ISR for pages | Minimal serverless invocations |
| **Edge caching** | Vercel CDN | Sub-50ms TTFB globally |
| **Zero external APIs** | Self-contained demo data | No API costs |
| **Minimal bundle** | Recharts only (no D3 bloat) | Fast load times |

**Total monthly cost: $0** (Vercel + Supabase free tiers)

**Production scaling path:**
- Add Supabase PostgreSQL ($25/mo) when real data needed
- Add Redis via Upstash ($0-10/mo) for session caching
- Vercel Pro ($20/mo) for team features
- **Total production cost: ~$55/month** for 500+ users

**Production hardening already represented in the repo:**
- `ApiIdempotencyKey` prevents double submits on approval, shared-goal push, and check-in save APIs.
- `OutboxEvent` decouples email/Teams delivery from user-facing transactions.
- `IntegrationSyncRun` records Microsoft Graph sync status and failures.
- `version` columns on mutable goal records enable optimistic locking.
- `middleware.ts` applies security headers and request IDs.

---

## 5. Evaluation Criteria Mapping

| Criterion | Architecture Feature | Score Impact |
|---|---|---|
| **1. Functionality** | Dual-layer validation (client + API), idempotent operations | End-to-end flows never break |
| **2. BRD Adherence** | Zod schemas enforce exact BRD rules at API level | Mathematical constraints guaranteed |
| **3. User Friendliness** | Optimistic UI via Zustand = instant feedback | Zero perceived latency |
| **4. Zero Bugs** | TypeScript strict + Zod + math guards (÷0, NaN) | Defensive at every layer |
| **5. Good-to-Have** | Modular services (Goal/Escalation/Notification/Analytics) | All 4 bonus features implemented |
| **6. Cost Optimization** | $0 infrastructure, client-side compute, serverless | Maximum cost efficiency |

---

## 6. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR + SPA + API routes in one |
| Language | TypeScript (strict) | Type safety across stack |
| State | Zustand + Immer | Lightweight, performant, persistent |
| Validation | Zod | Runtime type checking at API boundary |
| Charts | Recharts | Lightweight, composable, React-native |
| Styling | Inline styles (design system) | Zero CSS conflicts, pixel-perfect |
| Notifications | Sonner (toasts) | Beautiful, accessible toast system |
| Exports | SheetJS | Client-side Excel/CSV generation |
| Hosting | Vercel | Serverless, edge-cached, free tier |
| CI/CD | Vercel Git Integration | Auto-deploy on push |
