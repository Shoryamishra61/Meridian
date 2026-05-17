const baseUrl = process.env.MERIDIAN_SMOKE_BASE_URL ?? 'http://localhost:3000';

async function expectOk(name, path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${name} failed: ${response.status} ${text.slice(0, 300)}`);
  }
  console.log(`PASS ${name}`);
}

await expectOk('health', '/api/health');
await expectOk('goal sheet validation', '/api/goal-sheets/validate', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    goals: [
      { title: 'Revenue growth', weightage: 40 },
      { title: 'Operational excellence', weightage: 30 },
      { title: 'People development', weightage: 30 },
    ],
  }),
});
await expectOk('Entra readiness', '/api/integrations/entra/readiness');
await expectOk('Teams card generation', '/api/integrations/teams-card', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-meridian-demo-role': 'ADMIN',
    'x-meridian-demo-user-id': 'admin-kavya-001',
  },
  body: JSON.stringify({
    title: 'Goal sheet submitted',
    message: 'Priya Nair submitted her FY26 goal sheet for approval.',
    deepLink: `${baseUrl}/team?employee=emp-priya-001`,
  }),
});
