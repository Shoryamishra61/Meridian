import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import type { MicrosoftEntraIDProfile } from 'next-auth/providers/microsoft-entra-id';
import { USER_ROLES } from '@/lib/constants';
import { resolveRoleFromEntraClaims } from '@/server/auth/role-mapping';

const entraIssuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER?.replace(/\/$/, '');

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: entraIssuer,
      profile(profile: MicrosoftEntraIDProfile) {
        return {
          id: profile.oid ?? profile.sub,
          name: profile.name,
          email: profile.email ?? profile.preferred_username,
          image: null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, profile }) {
      const entraProfile = profile as Partial<MicrosoftEntraIDProfile> | undefined;
      if (entraProfile) {
        token.azureObjectId = entraProfile.oid;
        token.tenantId = entraProfile.tid;
        token.role = resolveRoleFromEntraClaims({
          roles: entraProfile.roles,
          groups: entraProfile.groups,
        });
      }
      token.role ??= USER_ROLES.EMPLOYEE;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? token.email ?? 'unknown-user';
      session.user.role = token.role;
      session.user.azureObjectId = token.azureObjectId;
      session.user.tenantId = token.tenantId;
      return session;
    },
  },
});
