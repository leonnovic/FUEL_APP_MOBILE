const { execSync } = require('child_process');

let dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

if (process.env.TURSO_DATABASE_URL) {
  dbUrl = process.env.TURSO_DATABASE_URL;
  if (process.env.TURSO_DATABASE_TURSO_AUTH_TOKEN) {
    dbUrl += `?authToken=${process.env.TURSO_DATABASE_TURSO_AUTH_TOKEN}`;
  }
}

console.log(`[db-push] Using database: ${dbUrl.replace(/authToken=.*/, 'authToken=***')}`);

execSync('npx prisma db push --accept-data-loss', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: dbUrl },
});
