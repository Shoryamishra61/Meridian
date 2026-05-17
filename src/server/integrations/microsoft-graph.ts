import { env } from '@/server/config/env';

const graphBaseUrl = 'https://graph.microsoft.com/v1.0';

export interface GraphUser {
  id: string;
  displayName: string | null;
  mail: string | null;
  userPrincipalName: string;
  department: string | null;
  jobTitle: string | null;
  accountEnabled: boolean | null;
}

export interface GraphDirectReport extends GraphUser {
  managerId: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function assertGraphConfig() {
  if (!env.MICROSOFT_TENANT_ID || !env.MICROSOFT_GRAPH_CLIENT_ID || !env.MICROSOFT_GRAPH_CLIENT_SECRET) {
    throw new Error('Microsoft Graph sync is not configured. Set tenant id, client id, and client secret.');
  }
}

export async function getGraphAppToken(): Promise<string> {
  assertGraphConfig();
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const tokenUrl = `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: env.MICROSOFT_GRAPH_CLIENT_ID!,
    client_secret: env.MICROSOFT_GRAPH_CLIENT_SECRET!,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph token request failed: ${response.status} ${errorText}`);
  }

  const token = (await response.json()) as TokenResponse;
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };

  return token.access_token;
}

async function graphGet<T>(path: string): Promise<T> {
  const token = await getGraphAppToken();
  const response = await fetch(`${graphBaseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph GET ${path} failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export async function listUsersPage(top = 50) {
  return graphGet<{ value: GraphUser[]; '@odata.nextLink'?: string }>(
    `/users?$top=${top}&$select=id,displayName,mail,userPrincipalName,department,jobTitle,accountEnabled`
  );
}

export async function listDirectReports(managerObjectId: string) {
  return graphGet<{ value: GraphDirectReport[] }>(
    `/users/${managerObjectId}/directReports?$select=id,displayName,mail,userPrincipalName,department,jobTitle,accountEnabled`
  );
}

export async function listTransitiveGroups(userObjectId: string) {
  return graphGet<{ value: Array<{ id: string; displayName?: string }> }>(
    `/users/${userObjectId}/transitiveMemberOf?$select=id,displayName`
  );
}
