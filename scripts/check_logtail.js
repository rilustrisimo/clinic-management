const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

function loadEnv() {
  const candidates = [
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
  const token = process.env.LOGTAIL_TOKEN;
  if (!token) {
    console.error('LOGTAIL_TOKEN not found in env.');
    process.exit(1);
  }
  const res = await fetch('https://in.logtail.com/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: 'health-check: logtail is configured',
      level: 'info',
      source: 'health-check',
      timestamp: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    console.error('Logtail ingestion failed:', res.status, await res.text());
    process.exit(1);
  }
  console.log('Logtail accepted a test log.');
}

main().catch((e) => {
  console.error('Logtail check error:', e.message);
  process.exit(1);
});
