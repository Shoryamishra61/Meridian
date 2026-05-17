# Evaluation Matrix

| Criterion | Evidence In Codebase |
| --- | --- |
| Functionality of the portal | Employee goal creation, manager approval, quarterly check-ins, admin shared goals, reports, analytics, audit, escalations |
| BRD adherence | `src/server/domain/goal-policy.ts`, `src/lib/calculations.ts`, `src/lib/validations.ts`, Prisma constraints |
| User friendliness | Role-specific routes, wizard creation, inline validation, empty/loading/error states, responsive shell |
| Presence of bugs | TypeScript strict mode, lint/build gates, domain policy checks, route-level error recovery |
| Good-to-have features | Mock Entra SSO, email event queue, Teams Adaptive Cards, escalation engine, analytics module, Excel/CSV reports |
| Cost optimization | Serverless architecture, client-side exports, no long-running workers, documented cost model |

## Must-Have Traceability

| BRD Requirement | Implementation |
| --- | --- |
| Thrust Area, title, description | `GoalCreateDialog` |
| Numeric, %, timeline, zero-based UoM | `GoalCreateDialog`, `calculateProgressScore` |
| Total weightage exactly 100% | `WeightageTracker`, `validateGoalSheetForSubmission` |
| Minimum 10% weightage | UI validation, domain policy, DB constraint |
| Maximum 8 goals | UI disable, data-store enforcement, domain policy |
| Manager inline target/weight edits | `src/app/(portal)/team/page.tsx` |
| Return for rework with comment | `team/page.tsx`, notifications, audit |
| Lock on approval | `updateSheetStatus(...LOCKED...)`, DB trigger plan |
| Shared goals with read-only title/target | `admin/shared-goals/page.tsx`, `data-store.updateGoal` |
| Primary owner actual sync | `data-store.submitQuarterlyUpdate` |
| Quarterly actual capture | `checkins/page.tsx` |
| Manager check-in comment | `checkins/page.tsx`, `validateManagerCheckinComment` |
| Progress formulas | `src/lib/calculations.ts` |
| Schedule windows | `demo-date-store`, `constants`, `goal-policy` |
| Reports CSV/Excel | `reports/page.tsx` |
| Completion dashboard | `dashboard`, `analytics`, admin views |
| Audit trail | `admin/audit/page.tsx`, Prisma trigger |
| Microsoft Entra mock SSO | `app/page.tsx`, `auth-store.ts`, `admin/integrations/page.tsx` |
| Email and Teams notifications | `data-store.addNotification`, `admin/integrations/page.tsx`, `api/integrations/teams-card` |
| Rule-based escalations | `data-store.runEscalationScan`, `admin/escalations/page.tsx` |
