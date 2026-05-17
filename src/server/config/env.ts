import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_MICROSOFT_ENTRA_ID_ID: z.string().min(1).optional(),
  AUTH_MICROSOFT_ENTRA_ID_SECRET: z.string().min(1).optional(),
  AUTH_MICROSOFT_ENTRA_ID_ISSUER: z.string().url().optional(),
  MICROSOFT_TENANT_ID: z.string().min(1).optional(),
  MICROSOFT_GRAPH_CLIENT_ID: z.string().min(1).optional(),
  MICROSOFT_GRAPH_CLIENT_SECRET: z.string().min(1).optional(),
  MERIDIAN_AUTH_MODE: z.enum(['demo', 'entra']).default('demo'),
  MERIDIAN_DEMO_API_KEY: z.string().min(16).optional(),
});

export const env = envSchema.parse(process.env);

export function getDeploymentReadiness() {
  const authReady = Boolean(
    env.AUTH_SECRET &&
      env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
      env.AUTH_MICROSOFT_ENTRA_ID_ISSUER
  );

  const graphReady = Boolean(
    env.MICROSOFT_TENANT_ID && env.MICROSOFT_GRAPH_CLIENT_ID && env.MICROSOFT_GRAPH_CLIENT_SECRET
  );

  return {
    mode: env.MERIDIAN_AUTH_MODE,
    databaseReady: Boolean(env.DATABASE_URL),
    authReady,
    graphReady,
    productionReady: Boolean(env.DATABASE_URL && env.AUTH_SECRET && authReady),
    missing: [
      ['DATABASE_URL', env.DATABASE_URL],
      ['AUTH_SECRET', env.AUTH_SECRET],
      ['AUTH_MICROSOFT_ENTRA_ID_ID', env.AUTH_MICROSOFT_ENTRA_ID_ID],
      ['AUTH_MICROSOFT_ENTRA_ID_SECRET', env.AUTH_MICROSOFT_ENTRA_ID_SECRET],
      ['AUTH_MICROSOFT_ENTRA_ID_ISSUER', env.AUTH_MICROSOFT_ENTRA_ID_ISSUER],
      ['MICROSOFT_TENANT_ID', env.MICROSOFT_TENANT_ID],
      ['MICROSOFT_GRAPH_CLIENT_ID', env.MICROSOFT_GRAPH_CLIENT_ID],
      ['MICROSOFT_GRAPH_CLIENT_SECRET', env.MICROSOFT_GRAPH_CLIENT_SECRET],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key),
  };
}
