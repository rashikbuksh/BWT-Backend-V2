import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, openAPI } from 'better-auth/plugins';

import db from '@/db'; // your drizzle instance
import env from '@/env';
import { ALLOWED_ROUTES } from '@/middlewares/auth';
import { sso } from '@better-auth/sso';

const isVps = env.NODE_ENV === 'vps';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg', // or "mysql", "sqlite"
  }),
  baseURL: isVps ? env.BETTER_AUTH_PRODUCTION_URL : env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID as string,
      clientSecret: env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: isVps
      ? {
          sameSite: 'none',
          secure: true,
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        }
      : {
          sameSite: 'lax',
          secure: false,
          httpOnly: true,
        },
  },
  plugins: [
    openAPI(),
    sso(),
    admin(),
  ],
  trustedOrigins: ALLOWED_ROUTES,
});

export interface AuthType {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
}
