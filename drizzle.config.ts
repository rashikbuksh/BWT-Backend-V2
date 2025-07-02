import { defineConfig } from 'drizzle-kit';

import env from '@/env';

const command = process.argv[2];
const isGenerateOrIntrospect = ['generate', 'introspect', 'studio'].includes(
  command,
);
const isMigrateDropOrPush = ['migrate', 'drop', 'push'].includes(command);

let config;
const defaultConfig = {
  dialect: 'postgresql',
  schema: './src/routes/*/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
};

if (isGenerateOrIntrospect) {
  config = {
    ...defaultConfig,
    schemaFilter: [
      'portfolio',
      'hr',

    ],
  };
}
else if (isMigrateDropOrPush) {
  config = {
    ...defaultConfig,
    migrations: { table: 'migrations_details' },
  };
}

export default defineConfig(config as any);
