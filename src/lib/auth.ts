import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { openAPI } from 'better-auth/plugins';

import db from '@/db'; // your drizzle instance

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

  // advanced: {
  //   cookiePrefix: 'bwt_', // default is 'ba_'
  //   // cookies: {
  //   //   session_token: {
  //   //     name: 'custom_session_token',
  //   //     attributes: {

  //   //     },
  //   //   },
  //   // },
  // },
  plugins: [openAPI()],
});

export interface AuthType {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
}
