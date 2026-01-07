const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

function loadEnv() {
  const candidates = [
    path.resolve(__dirname, '../apps/web/.env.local'),
    path.resolve(__dirname, '../apps/worker/.env.local'),
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      return p;
    }
  }
}

async function main() {
  loadEnv();
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.error('SENTRY_DSN not found in env.');
    process.exit(1);
  }
  let Sentry;
  try {
    Sentry = require('@sentry/node');
  } catch (e) {
    console.error('@sentry/node is not installed.');
    process.exit(1);
  }
  Sentry.init({ dsn, tracesSampleRate: 0 });
  Sentry.captureMessage('health-check: sentry is configured');
  await Sentry.flush(2000);
  console.log('Sentry event sent (check Sentry UI to confirm).');
}

main().catch((e) => {
  console.error('Sentry check error:', e.message);
  process.exit(1);
});
