const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnv() {
  const candidates = [
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
  const loaded = loadEnv();
  const url = process.env.REDIS_URL;
  if (!url) {
    console.error('REDIS_URL not found in env. Checked apps/worker/.env.local, .env.local, .env');
    process.exit(1);
  }
  let Redis;
  try {
    Redis = require('ioredis');
  } catch (e) {
    console.error('ioredis is not installed. Please install it.');
    process.exit(1);
  }
  const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  await client.connect();
  const pong = await client.ping();
  await client.quit();
  if (pong !== 'PONG') {
    console.error('Unexpected Redis PING response:', pong);
    process.exit(1);
  }
  console.log('Redis connected successfully and responded to PING.');
}

main().catch((e) => {
  console.error('Redis check error:', e.message);
  process.exit(1);
});
