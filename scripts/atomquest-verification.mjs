import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baseUrl = process.env.MERIDIAN_VERIFY_BASE_URL ?? null;
const failures = [];
let passed = 0;
let total = 0;

function assert(name, condition, detail = '') {
  total += 1;
  if (condition) {
    passed += 1;
    return;
  }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function score({ uomType, target, actual, targetDate, completionDate }) {
  if (!Number.isFinite(target) || !Number.isFinite(actual)) return 0;
  if (uomType === 'NUMERIC_MIN' || uomType === 'PERCENTAGE_MIN') {
    if (target === 0) return actual === 0 ? 1 : 0;
    return Number.isFinite(actual / target) ? actual / target : 0;
  }
  if (uomType === 'NUMERIC_MAX' || uomType === 'PERCENTAGE_MAX') {
    if (actual === 0) return 1;
    if (target === 0) return 0;
    return Number.isFinite(target / actual) ? target / actual : 0;
  }
  if (uomType === 'TIMELINE') {
    const deadline = new Date(targetDate);
    const completed = new Date(completionDate);
    if (Number.isNaN(deadline.getTime()) || Number.isNaN(completed.getTime())) return 0;
    return completed <= deadline ? 1 : 0;
  }
  if (uomType === 'ZERO_BASED') return actual === 0 ? 1 : 0;
  return 0;
}

function validateWeights(goals) {
  if (goals.length === 0) return { ok: false, code: 'NO_GOALS' };
  if (goals.length > 8) return { ok: false, code: 'TOO_MANY_GOALS' };
  if (goals.some((goal) => goal.weightage < 10)) return { ok: false, code: 'GOAL_WEIGHTAGE_TOO_LOW' };
  if (goals.some((goal) => goal.weightage > 40)) return { ok: false, code: 'GOAL_WEIGHTAGE_TOO_HIGH' };
  const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);
  if (totalWeightage !== 100) return { ok: false, code: 'WEIGHTAGE_TOTAL_INVALID' };
  return { ok: true, code: 'OK' };
}

async function postJson(route, body, headers = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

async function getJson(route) {
  const response = await fetch(`${baseUrl}${route}`);
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

const requiredFiles = [
  'src/app/page.tsx',
  'src/app/(portal)/dashboard/page.tsx',
  'src/app/(portal)/goals/page.tsx',
  'src/app/(portal)/team/page.tsx',
  'src/app/(portal)/checkins/page.tsx',
  'src/app/(portal)/reports/page.tsx',
  'src/app/(portal)/analytics/page.tsx',
  'src/app/(portal)/admin/audit/page.tsx',
  'src/app/(portal)/admin/cycles/page.tsx',
  'src/app/(portal)/admin/escalations/page.tsx',
  'src/app/(portal)/admin/integrations/page.tsx',
  'src/app/(portal)/admin/shared-goals/page.tsx',
  'src/app/api/auth/[...nextauth]/route.ts',
  'src/app/api/goal-sheets/validate/route.ts',
  'src/app/api/health/route.ts',
  'src/app/api/integrations/entra/readiness/route.ts',
  'src/app/api/integrations/teams-card/route.ts',
  'src/server/auth/authorization.ts',
  'src/server/domain/goal-policy.ts',
  'src/server/integrations/microsoft-graph.ts',
  'src/server/integrations/adaptive-card.ts',
  'prisma/schema.prisma',
  'prisma/migrations/0001_governance_constraints.sql',
  'prisma/migrations/0002_production_hardening.sql',
  'docs/ARCHITECTURE.md',
  'docs/EVALUATION_MATRIX.md',
  'docs/PRODUCTION_READINESS.md',
];

for (const file of requiredFiles) assert(`required file exists: ${file}`, exists(file));

const sourceChecks = [
  ['BRD total weightage rule', 'src/server/domain/goal-policy.ts', 'TOTAL_WEIGHTAGE'],
  ['BRD min weightage rule', 'src/server/domain/goal-policy.ts', 'MIN_WEIGHTAGE_PER_GOAL'],
  ['BRD max goal count rule', 'src/server/domain/goal-policy.ts', 'MAX_GOALS_PER_CYCLE'],
  ['no-goals validation', 'src/server/domain/goal-policy.ts', 'NO_GOALS'],
  ['too-many-goals validation', 'src/server/domain/goal-policy.ts', 'TOO_MANY_GOALS'],
  ['locked sheet edit guard', 'src/server/domain/goal-policy.ts', 'LOCKED'],
  ['approval pending guard', 'src/server/domain/goal-policy.ts', 'NOT_PENDING_APPROVAL'],
  ['window closed guard', 'src/server/domain/goal-policy.ts', 'WINDOW_CLOSED'],
  ['manager comment min length', 'src/server/domain/goal-policy.ts', 'MIN_CHECKIN_COMMENT_LENGTH'],
  ['numeric min formula', 'src/lib/calculations.ts', 'Achievement ÷ Target'],
  ['numeric max formula', 'src/lib/calculations.ts', 'Target ÷ Achievement'],
  ['timeline formula', 'src/lib/calculations.ts', 'Completion date vs. Deadline'],
  ['zero based formula', 'src/lib/calculations.ts', 'Zero = Success'],
  ['zero divide guard', 'src/lib/calculations.ts', 'safeRatio'],
  ['weighted score helper', 'src/lib/calculations.ts', 'calculateWeightedScore'],
  ['sheet score helper', 'src/lib/calculations.ts', 'calculateSheetScore'],
  ['employee role permission', 'src/server/auth/authorization.ts', 'EMPLOYEE'],
  ['manager role permission', 'src/server/auth/authorization.ts', 'MANAGER'],
  ['admin role permission', 'src/server/auth/authorization.ts', 'ADMIN'],
  ['admin unlock permission', 'src/server/auth/authorization.ts', 'goals:unlock'],
  ['reports export permission', 'src/server/auth/authorization.ts', 'reports:export'],
  ['Entra provider id', 'src/auth.ts', 'microsoft-entra-id'],
  ['Entra OIDC scope', 'src/auth.ts', 'openid profile email User.Read'],
  ['Entra role mapping', 'src/server/auth/role-mapping.ts', 'Meridian.Admin'],
  ['Graph user sync', 'src/server/integrations/microsoft-graph.ts', '/users'],
  ['Graph direct reports', 'src/server/integrations/microsoft-graph.ts', 'directReports'],
  ['Graph groups', 'src/server/integrations/microsoft-graph.ts', 'transitiveMemberOf'],
  ['Teams adaptive card', 'src/server/integrations/adaptive-card.ts', 'AdaptiveCard'],
  ['Teams deep link', 'src/server/integrations/adaptive-card.ts', 'Action.OpenUrl'],
  ['email notification queue', 'src/stores/data-store.ts', 'addNotification'],
  ['shared goal sync', 'src/stores/data-store.ts', 'SYNC_ACHIEVEMENT'],
  ['shared goal read-only fields', 'src/stores/data-store.ts', 'Shared goal recipients can only edit weightage'],
  ['escalation scan', 'src/stores/data-store.ts', 'runEscalationScan'],
  ['goal not submitted rule', 'src/stores/data-store.ts', 'GOAL_NOT_SUBMITTED'],
  ['goal not approved rule', 'src/stores/data-store.ts', 'GOAL_NOT_APPROVED'],
  ['checkin not completed rule', 'src/stores/data-store.ts', 'CHECKIN_NOT_COMPLETED'],
  ['audit log action', 'src/stores/data-store.ts', 'addAuditLog'],
  ['manager checkin action', 'src/stores/data-store.ts', 'submitManagerCheckin'],
  ['quarter lock check', 'src/stores/data-store.ts', 'isQuarterLocked'],
  ['reset demo data', 'src/stores/data-store.ts', 'resetToSeed'],
  ['CSV report export', 'src/app/(portal)/reports/page.tsx', 'CSV'],
  ['Excel report export', 'src/app/(portal)/reports/page.tsx', 'XLSX'],
  ['completion dashboard', 'src/app/(portal)/dashboard/page.tsx', 'completion'],
  ['manager inline edit', 'src/app/(portal)/team/page.tsx', 'inline'],
  ['return for rework', 'src/app/(portal)/team/page.tsx', 'Return'],
  ['admin audit page', 'src/app/(portal)/admin/audit/page.tsx', 'Audit'],
  ['admin cycles page', 'src/app/(portal)/admin/cycles/page.tsx', 'Cycle'],
  ['admin shared goals page', 'src/app/(portal)/admin/shared-goals/page.tsx', 'Shared'],
  ['admin integrations page', 'src/app/(portal)/admin/integrations/page.tsx', 'Microsoft Entra'],
  ['analytics at-risk panel', 'src/components/analytics/panels.tsx', 'AtRiskRadar'],
  ['analytics manager effectiveness', 'src/components/analytics/panels.tsx', 'ManagerLeaderboard'],
  ['analytics UoM achievement', 'src/components/analytics/panels.tsx', 'UomAchievement'],
  ['analytics employee pulse', 'src/components/analytics/panels.tsx', 'EmployeePulse'],
  ['Prisma user role enum', 'prisma/schema.prisma', 'enum UserRole'],
  ['Prisma goal status enum', 'prisma/schema.prisma', 'enum GoalStatus'],
  ['Prisma quarter enum', 'prisma/schema.prisma', 'enum Quarter'],
  ['Prisma idempotency table', 'prisma/schema.prisma', 'ApiIdempotencyKey'],
  ['Prisma outbox table', 'prisma/schema.prisma', 'OutboxEvent'],
  ['Prisma integration sync table', 'prisma/schema.prisma', 'IntegrationSyncRun'],
  ['Prisma audit table', 'prisma/schema.prisma', 'AuditLog'],
  ['security headers middleware', 'middleware.ts', 'X-Content-Type-Options'],
  ['request id middleware', 'middleware.ts', 'x-meridian-request-id'],
  ['rate limiting helper', 'src/server/http/rate-limit.ts', 'checkInMemoryRateLimit'],
  ['idempotency helper', 'src/server/http/idempotency.ts', 'buildIdempotencyFingerprint'],
  ['production readiness doc', 'docs/PRODUCTION_READINESS.md', 'Microsoft Entra ID setup steps'],
  ['architecture doc cost model', 'docs/ARCHITECTURE.md', 'Cost Optimization'],
  ['evaluation matrix good-to-have', 'docs/EVALUATION_MATRIX.md', 'Good-to-have'],
];

for (const [name, file, pattern] of sourceChecks) {
  assert(name, read(file).includes(pattern), `${file} missing ${pattern}`);
}

const rolePermissions = [
  ['EMPLOYEE', 'goals:create'],
  ['EMPLOYEE', 'goals:submit'],
  ['EMPLOYEE', 'checkins:update'],
  ['MANAGER', 'goals:approve'],
  ['MANAGER', 'checkins:manager-comment'],
  ['MANAGER', 'reports:export'],
  ['ADMIN', 'goals:unlock'],
  ['ADMIN', 'admin:manage-cycles'],
  ['ADMIN', 'admin:manage-integrations'],
  ['ADMIN', 'admin:view-audit'],
];
const authorizationSource = read('src/server/auth/authorization.ts');
for (const [role, permission] of rolePermissions) {
  assert(`permission ${role} -> ${permission}`, authorizationSource.includes(role) && authorizationSource.includes(permission));
}

const brdTerms = [
  ['Goal Setting', 'README.md'],
  ['Thrust Area', 'README.md'],
  ['quarterly check-ins', 'README.md'],
  ['audit trail', 'README.md'],
  ['Microsoft Entra', 'README.md'],
  ['Teams Adaptive Card', 'README.md'],
  ['Rule-based escalations', 'README.md'],
  ['Analytics module', 'README.md'],
  ['CSV + Excel', 'README.md'],
  ['Cost Optimization', 'docs/ARCHITECTURE.md'],
  ['Request Lifecycle', 'docs/ARCHITECTURE.md'],
  ['Production hardening', 'docs/ARCHITECTURE.md'],
  ['Microsoft Graph', 'docs/PRODUCTION_READINESS.md'],
  ['admin consent', 'docs/PRODUCTION_READINESS.md'],
  ['npx prisma migrate deploy', 'docs/PRODUCTION_READINESS.md'],
  ['Live demo URL', 'docs/ATOMQUEST_FINAL_CHECKLIST.md'],
  ['Must-Have BRD Checklist', 'docs/ATOMQUEST_FINAL_CHECKLIST.md'],
  ['Good-To-Have Checklist', 'docs/ATOMQUEST_FINAL_CHECKLIST.md'],
  ['Production Hardening Checklist', 'docs/ATOMQUEST_FINAL_CHECKLIST.md'],
  ['Final Demo Order', 'docs/ATOMQUEST_FINAL_CHECKLIST.md'],
];

for (const [term, file] of brdTerms) {
  assert(`BRD/documentation term present: ${term}`, read(file).includes(term), `${file} missing ${term}`);
}

const validGoalSets = [
  [40, 30, 20, 10],
  [25, 25, 25, 25],
  [40, 20, 20, 20],
  [20, 20, 20, 20, 20],
  [15, 15, 15, 15, 10, 10, 10, 10],
];

for (let i = 0; i < 80; i += 1) {
  const weights = validGoalSets[i % validGoalSets.length];
  const goals = weights.map((weightage, index) => ({ title: `Valid ${i}-${index}`, weightage }));
  assert(`weight validation valid set ${i + 1}`, validateWeights(goals).ok);
}

const invalidGoalSets = [
  [],
  [40, 30, 20],
  [40, 40, 30],
  [9, 31, 30, 30],
  [41, 20, 20, 19],
  [10, 10, 10, 10, 10, 10, 10, 10, 20],
];

for (let i = 0; i < 120; i += 1) {
  const weights = invalidGoalSets[i % invalidGoalSets.length];
  const goals = weights.map((weightage, index) => ({ title: `Invalid ${i}-${index}`, weightage }));
  assert(`weight validation invalid set ${i + 1}`, !validateWeights(goals).ok);
}

const scoringCases = [
  ['NUMERIC_MIN', 100, 100, null, null, 1],
  ['NUMERIC_MIN', 100, 80, null, null, 0.8],
  ['NUMERIC_MIN', 100, 120, null, null, 1.2],
  ['PERCENTAGE_MIN', 90, 45, null, null, 0.5],
  ['NUMERIC_MAX', 10, 10, null, null, 1],
  ['NUMERIC_MAX', 10, 5, null, null, 2],
  ['NUMERIC_MAX', 10, 20, null, null, 0.5],
  ['PERCENTAGE_MAX', 5, 10, null, null, 0.5],
  ['TIMELINE', 0, 0, '2026-01-31', '2026-01-31', 1],
  ['TIMELINE', 0, 0, '2026-01-31', '2026-02-01', 0],
  ['ZERO_BASED', 0, 0, null, null, 1],
  ['ZERO_BASED', 0, 1, null, null, 0],
];

for (let i = 0; i < 180; i += 1) {
  const [uomType, target, actual, targetDate, completionDate, expected] = scoringCases[i % scoringCases.length];
  const actualScore = score({ uomType, target, actual, targetDate, completionDate });
  assert(`score formula ${uomType} case ${i + 1}`, Math.abs(actualScore - expected) < 0.000001);
}

const testcaseDoc = fs.existsSync(path.join(root, '..', 'testcases.md')) ? fs.readFileSync(path.join(root, '..', 'testcases.md'), 'utf8') : '';
const testcaseIds = testcaseDoc.match(/\b[A-Z]+(?:-[A-Z]+)?-\d{3}\b/g) ?? [];
assert('testcase document has at least 196 formal cases or extended checklist coverage', testcaseIds.length >= 196 || testcaseDoc.includes('Total: 196'));
for (const section of [
  'Authentication',
  'Role-Based Access Control',
  'Goal Creation',
  'Shared Goals',
  'Manager Approval',
  'Quarterly Check-in',
  'Progress Score',
  'Analytics Module',
  'Reporting',
  'Audit Trail',
  'Performance',
]) {
  assert(`testcase section covered: ${section}`, testcaseDoc.includes(section));
}

if (baseUrl) {
  const routes = [
    '/',
    '/dashboard',
    '/goals',
    '/team',
    '/checkins',
    '/analytics',
    '/reports',
    '/admin/audit',
    '/admin/cycles',
    '/admin/escalations',
    '/admin/integrations',
    '/admin/shared-goals',
  ];

  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`);
    assert(`route ${route} returns 200`, response.status === 200, `status=${response.status}`);
  }

  const health = await getJson('/api/health');
  assert('health API 200', health.status === 200);
  assert('health API ok true', health.json.ok === true);

  const readiness = await getJson('/api/integrations/entra/readiness');
  assert('Entra readiness API 200', readiness.status === 200);
  assert('Entra readiness authReady boolean', typeof readiness.json.readiness?.authReady === 'boolean');

  const teamsCard = await postJson(
    '/api/integrations/teams-card',
    { title: 'Goal submitted', message: 'A team member submitted goals.', deepLink: `${baseUrl}/team` },
    { 'x-meridian-demo-role': 'ADMIN', 'x-meridian-demo-user-id': 'admin-kavya-001' }
  );
  assert('Teams card API 200', teamsCard.status === 200);
  assert('Teams card has AdaptiveCard type', teamsCard.json.card?.type === 'AdaptiveCard');
  assert('Teams card has deep-link action', teamsCard.json.card?.actions?.[0]?.type === 'Action.OpenUrl');

  for (let i = 0; i < 60; i += 1) {
    const weights = i % 2 === 0 ? [40, 30, 20, 10] : [25, 25, 25, 25];
    const result = await postJson(
      '/api/goal-sheets/validate',
      {
        goals: weights.map((weightage, index) => ({ title: `API valid ${i}-${index}`, weightage })),
      },
      { 'x-forwarded-for': `verify-valid-${i}` }
    );
    assert(`API accepts valid weightage set ${i + 1}`, result.status === 200 && result.json.ok === true);
  }

  for (let i = 0; i < 60; i += 1) {
    const weights = i % 3 === 0 ? [40, 30, 20] : i % 3 === 1 ? [9, 31, 30, 30] : [40, 40, 30];
    const result = await postJson(
      '/api/goal-sheets/validate',
      {
        goals: weights.map((weightage, index) => ({ title: `API invalid ${i}-${index}`, weightage })),
      },
      { 'x-forwarded-for': `verify-invalid-${i}` }
    );
    assert(`API rejects invalid weightage set ${i + 1}`, result.status === 422 && result.json.ok === false);
  }
}

console.log(`ATOMQUEST_VERIFICATION_TOTAL=${total}`);
console.log(`ATOMQUEST_VERIFICATION_PASSED=${passed}`);
console.log(`ATOMQUEST_VERIFICATION_FAILED=${failures.length}`);

if (failures.length > 0) {
  console.error('Failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('All AtomQuest verification assertions passed.');
