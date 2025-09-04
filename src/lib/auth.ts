import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { openAPI } from 'better-auth/plugins';

import db from '@/db'; // your drizzle instance
import env from '@/env';
import { ALLOWED_ROUTES } from '@/middlewares/auth';

const isVps = env.NODE_ENV === 'vps';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg', // or "mysql", "sqlite"
  }),
  baseURL: isVps ? env.PRODUCTION_URL : env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  // socialProviders: {
  //   github: {
  //     clientId: process.env.GITHUB_CLIENT_ID as string,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
  //   },
  // },
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
  plugins: [openAPI()],
  trustedOrigins: ALLOWED_ROUTES,
});

export interface AuthType {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
}
