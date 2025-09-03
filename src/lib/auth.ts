import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
// import { openAPI } from 'better-auth/plugins';

import db from '@/db'; // your drizzle instance
import { ALLOWED_ROUTES } from '@/middlewares/auth';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg', // or "mysql", "sqlite"
  }),
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
      // domain: '103.147.163.46', // your domain here
    },
    defaultCookieAttributes: {
      sameSite: 'lax',
      // secure: true,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
  // plugins: [openAPI()],
  trustedOrigins: [
    ...ALLOWED_ROUTES,
  ],
});

export interface AuthType {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
}
