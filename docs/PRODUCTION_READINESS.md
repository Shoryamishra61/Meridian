# Meridian Production Readiness Plan

## What is now in the codebase

- Microsoft Entra ID Auth.js wiring at `/api/auth/[...nextauth]`.
- Entra readiness API at `/api/integrations/entra/readiness`.
- Microsoft Graph app-only client for org/user/direct-report sync.
- Server-side RBAC helpers for employee, manager, and admin permissions.
- API rate limiting for validation and Teams-card generation endpoints.
- Security headers through `middleware.ts`.
- Prisma production primitives: optimistic version fields, idempotency keys, outbox events, notification delivery state, and integration sync-run audit records.
- Production smoke test script: `npm run test:smoke`.

## Microsoft Entra ID setup steps

1. In Microsoft Entra admin center, create an App Registration named `Meridian`.
2. Add redirect URI: `https://<your-domain>/api/auth/callback/microsoft-entra-id`.
3. Create a client secret and copy its value immediately.
4. Add environment variables from `.env.example`:
   - `AUTH_SECRET`
   - `AUTH_MICROSOFT_ENTRA_ID_ID`
   - `AUTH_MICROSOFT_ENTRA_ID_SECRET`
   - `AUTH_MICROSOFT_ENTRA_ID_ISSUER`
   - `MERIDIAN_AUTH_MODE=entra`
5. Prefer Entra app roles:
   - `Meridian.Employee`
   - `Meridian.Manager`
   - `Meridian.Admin`
6. If using groups instead, set the three `ENTRA_*_GROUP_ID` variables.
7. For org hierarchy sync, create or reuse a Graph app permission grant with admin consent:
   - `User.Read.All`
   - `GroupMember.Read.All`
   - `Directory.Read.All` if direct-report and richer directory reads are required.
8. Set:
   - `MICROSOFT_TENANT_ID`
   - `MICROSOFT_GRAPH_CLIENT_ID`
   - `MICROSOFT_GRAPH_CLIENT_SECRET`
9. Hit `/api/integrations/entra/readiness`; all production readiness flags should be true except optional demo values.

## Deployment steps

1. Provision Postgres through Supabase, Neon, Azure Database for PostgreSQL, or RDS.
2. Set `DATABASE_URL` in hosting secrets.
3. Run `npx prisma migrate deploy`.
4. Run `npm run test:production-gates`.
5. Deploy on Vercel or Azure App Service.
6. Run `npm run test:smoke` against the deployed URL:
   `MERIDIAN_SMOKE_BASE_URL=https://<your-domain> npm run test:smoke`.

## Remaining external work

- Entra tenant creation, app registration, admin consent, and production secrets cannot be completed inside the repo.
- Email/Teams delivery needs real provider credentials and webhook registration.
- Load tests need a deployed environment and realistic tenant data volume.
