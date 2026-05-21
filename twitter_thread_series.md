# Meridian — AtomQuest Hackathon Day-by-Day X/Twitter Thread Series
**Developer:** Shoryakumar Mishra  
**Hackathon:** Atomberg's AtomQuest 1.0  
**Project:** Meridian (Enterprise Performance & Goal Tracking Portal)  

Here is the complete, day-by-day thread series designed to showcase the engineering depth, system design decisions, and feature highlights of Meridian. Each day represents a standalone, multi-part thread.

---

## Day 1: The Challenge, The Vision, & 10-Layer Architecture 🏗️
*Focus: Problem definition, high-level approach, and mapping out the architecture.*

### Tweet 1 (Hook/Intro)
> 📊 Spreadsheets, email bottlenecks, and manual calculations. That is how most scaling companies manage performance goals.
>
> For Atomberg’s AtomQuest 1.0, I set out to build **Meridian**: a production-grade Performance & Goal Tracking Portal. 
> 
> Here is how I architected it. 🧵👇

### Tweet 2 (The Core Problem)
> Performance tracking sounds simple until you hit the edge cases:
> 
> ❌ Out-of-sync org hierarchies
> ❌ Sum of weightages exceeding 100%
> ❌ Manager feedback lost in emails
> ❌ Historical edits with no audit trail
> 
> Meridian digitizes and secures the entire goal lifecycle.

### Tweet 3 (The 10-Layer Architecture)
> To ensure scalability, I designed Meridian as a **microservice-ready monolith** split into 10 layers.
>
> From edge routing to validation, database mapping, and background jobs, every layer has a distinct responsibility. 
> 
> Check out the TikZ system blueprint I submitted! 👇

### Tweet 4 (Layers 1-4: Client & API)
> 🔹 L1: USERS (Adaptive roles for Employee, Manager, Admin)
> 🔹 L2: SECURITY (HSTS, CSP, and Edge Route Guards)
> 🔹 L3: FRONTEND (Next.js 16, React 19, Zustand stores)
> 🔹 L4: API GATEWAY (Edge endpoints, Zod schema validation, health checks)

### Tweet 5 (Layers 5-10: Backend & Infra)
> 🔹 L5: DOMAIN (Goal validation, progress math)
> 🔹 L6: AI (13 client-side heuristic agents)
> 🔹 L7: AUTH (NextAuth + Microsoft Entra ID SSO)
> 🔹 L8: DATABASE (PostgreSQL, Prisma ORM, Audit Trail)
> 🔹 L9: INTEGRATIONS (Teams Cards, Resend Email)
> 🔹 L10: INFRA (Vercel Edge, PWA)

### Tweet 6 (Day 1 Outro)
> Tomorrow, we dive into how I enforced absolute data integrity and built the core validation engine to guarantee that no business rule is ever bypassed. 
> 
> Live demo is already up! Try switching roles: https://meridian-orcin-nu.vercel.app

---

## Day 2: Business Logic & Core Validation Engine 🔒
*Focus: Zod schemas, TypeScript strictness, and enforcing mathematical constraints.*

### Tweet 1 (Intro)
> 🔢 How do you prevent data corruption in performance systems? It starts at the validation layer.
> 
> On Day 2 of my Meridian architecture breakdown, let’s look at how we enforce complex business rules at the schema level. 🧵👇

### Tweet 2 (The Business Rules)
> The Atomberg BRD had strict mathematical constraints:
> 
> 🎯 Maximum of 8 goals per cycle
> ⚖️ Minimum weightage of 10% per individual goal
> 💯 Total goal sheet weightage must sum to EXACTLY 100%
> 
> Bypass these, and your performance data becomes meaningless.

### Tweet 3 (Dual-Layer Validation)
> Meridian uses **Dual-Layer Validation**:
> 
> 1️⃣ Client-side: A dynamic `WeightageTracker` gives instant, interactive UI feedback to employees as they assign percentages.
> 2️⃣ Server-side: A strict Zod v4 validation schema blocks any malformed payload before it touches the database.

### Tweet 4 (TypeScript Strictness)
> We ran TypeScript in strict mode. Every API payload, component prop, and state slice is typed. 
> 
> If a manager tries to edit goals post-lock, type guards and route-level authorization block the transition. Compilation fails before buggy code commits.

### Tweet 5 (Zustand & Prisma Sync)
> For the demo, Meridian uses a persisted Zustand store mapped directly to a PostgreSQL Prisma schema.
> 
> This provides a local-first, zero-latency experience for evaluators while maintaining a strict 1-to-1 data model mirroring production Supabase tables.

---

## Day 3: The Calculation Engine & Shared Goals 🧮
*Focus: UoM calculations, locking workflows, and shared KPI cascading.*

### Tweet 1 (Intro)
> 📈 A goal is only as good as how you measure it. 
> 
> On Day 3, we look at the core of Meridian: the UoM (Unit of Measure) Engine, lock-on-approval workflows, and cascading shared goals. 🧵👇

### Tweet 2 (The 4 UoM Types)
> Goals are rarely just numeric. I implemented 4 distinct UoM calculation engines:
> 
> 1️⃣ Numeric: (Actual / Target) * Weight
> 2️⃣ Percentage: Direct actual vs target tracking
> 3️⃣ Timeline: Date-based milestone mapping
> 4️⃣ Zero-based: Boolean completions (e.g., product launch)

### Tweet 3 (Lock on Approval)
> Once a manager approves a goal sheet, the sheet status flips to `LOCKED`.
> 
> All fields freeze to prevent retroactive edits or target manipulation. If an employee needs to make changes, an Admin must manually trigger a cycle unlock.

### Tweet 4 (Cascading Shared Goals)
> Large organizations require top-down alignment. Meridian's Shared Goals Engine allows Admins to push company-wide KPIs to departmental teams.
> 
> Employees get these goals pre-loaded as read-only, but their achievement scores automatically sync with the primary owner's updates.

### Tweet 5 (Excel & CSV Reports)
> Executive teams need reports. Meridian features browser-side Excel/CSV generation via SheetJS.
> 
> It exports full department-level roll-ups, goal achievements, and check-in statuses at $0 server cost with instant file downloads.

---

## Day 4: Stripe-Style Security & Resilience Patterns 🛡️
*Focus: Idempotency keys, optimistic locking, outbox patterns, and canonical logs.*

### Tweet 1 (Intro)
> 🚀 In production, users double-click, networks drop, and database writes collide.
> 
> On Day 4 of the Meridian breakdown, let’s explore the enterprise security and resilience patterns I built to ensure database integrity under load. 🧵👇

### Tweet 2 (Idempotency Guard)
> To prevent double-submission issues (e.g., manager approving a sheet twice or double-saving weightages), I implemented **Idempotency Keys**.
> 
> Similar to Stripe's architecture, each transaction includes a unique hash. If a request retries, the server returns the cached response.

### Tweet 3 (Optimistic Locking)
> What happens if an employee updates their check-in actuals while a manager edits their target?
> 
> Meridian uses **Optimistic Locking** via `version` columns. If the row version has changed during a transaction, the write safely rolls back and retries.

### Tweet 4 (The Outbox Pattern)
> Sending emails or updating MS Teams cards shouldn't block user requests.
> 
> Meridian uses the **Transactional Outbox Pattern**: notifications are written to an `OutboxEvent` table in the same DB transaction as the goal update, then dispatched asynchronously.

### Tweet 5 (Stripe-Style Canonical Audit Trail)
> Auditing is key for HR. Instead of unstructured text, Meridian records a canonical log line of every edit:
> 
> `[Timestamp] [Actor] [EntityID] [Field] [Old Value] -> [New Value]`
> 
> It's immutable, append-only, and fully searchable via the Admin Audit Dashboard.

---

## Day 5: 13 Client-Side AI Agents, Dashboards, and Live Demo 🤖📊
*Focus: Serverless AI heuristics, Recharts visualizations, MS Integration, and live demo.*

### Tweet 1 (Intro)
> 🤖 AI-powered, visually stunning, and costs $0/month to run.
> 
> For the final day of our Meridian showcase, let’s look at the UI, the 13 client-side AI agents, and how we optimized hosting costs. 🧵👇

### Tweet 2 (13 Client-Side AI Agents)
> Most developers call OpenAI APIs and build up huge bills. I built **13 client-side heuristic AI Agents** that run at $0 compute cost:
> 
> 🧠 Goal Suggester (by role/area)
> 📝 SMART Scorer (checks specific targets)
> ⚠️ Anomaly Detector (flags unrealistic metrics)
> 📊 Insights Generator & more!

### Tweet 3 (8 Analytics Panels)
> Executive dashboards are powered by Recharts 3, providing 8 visual panels:
> 
> 🔹 Department score heatmaps
> 🔹 Quarter-over-Quarter achievement trends
> 🔹 Goal Completion Ring & Check-in timelines
> 🔹 Radar charts mapping corporate Thrust Areas

### Tweet 4 (Microsoft Teams & SSO)
> Meridian integrates with Microsoft Entra ID for Single Sign-On and maps tenant app roles.
> 
> It also generates Microsoft Teams Adaptive Cards (JSON v1.4) with deep-linked approval buttons to let managers review goals directly in chat.

### Tweet 5 (Cost Optimization & Demo)
> By utilizing Vercel serverless Edge functions, Zustand client-side caching, and browser-side PDF/CSV generation, the Meridian demo runs on **$0/month**.
> 
> To scale to 500+ concurrent enterprise users, the path is simple: Supabase DB + Upstash Redis (~$55/month).

### Tweet 6 (Walkthrough Video & CTA)
> I've recorded a full screen-record walkthrough demonstrating the live portal, role-switching, cycle schedules, and AI coaching. 
> 
> Watch the video below to see it in action!
> 
> 🔗 Live URL: https://meridian-orcin-nu.vercel.app
> 💻 GitHub: https://github.com/Shoryamishra61/Meridian
