/* eslint-disable node/no-process-env */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import path from 'node:path';
import { z } from 'zod';

expand(config({
  path: path.resolve(
    process.cwd(),
    process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  ),
}));

const logLevel = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const EnvSchema = z.object({
  SERVER_URL: z.string().default('http://localhost:3010'),
  PRODUCTION_URL: z.string().default('http://103.147.163.46:5090'),
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(9999),
  LOG_LEVEL: z.enum(logLevel).default('silent'),
  DATABASE_URL: z.string().url().default('postgres://postgres:PG0987654321@localhost:5432/bwt'),
  PRIVATE_KEY: z.string().default('12'),
  SALT: z.coerce.number().default(14),
  BETTER_AUTH_PORT: z.coerce.number().default(3006),
  BETTER_AUTH_SECRET: z.string().default('knUkEDOYJMlBBCdh8lQ2q0tteBh5g7PT'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3010'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type env = z.infer<typeof EnvSchema>;

// eslint-disable-next-line ts/no-redeclare
const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error('❌ Invalid env:');
  console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export default env!;
