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

function isBase64(str) {
  try {
    const b = Buffer.from(str, 'base64');
    // Check it encodes back losslessly
    return b.toString('base64') === str.replace(/\n|\r/g, '');
  } catch (_) {
    return false;
  }
}

async function main() {
  loadEnv();
  const keys = process.env.ENCRYPTION_KEYS || '';
  if (!keys) {
    console.error('ENCRYPTION_KEYS is empty.');
    process.exit(1);
  }
  const pairs = keys.split(',').map((s) => s.trim()).filter(Boolean);
  if (pairs.length === 0) {
    console.error('No keys found in ENCRYPTION_KEYS.');
    process.exit(1);
  }
  for (const p of pairs) {
    const [kid, b64] = p.split(':');
    if (!kid || !b64) {
      console.error(`Invalid key format (expect KID:BASE64): ${p}`);
      process.exit(1);
    }
    if (!/^[\w-]+$/.test(kid)) {
      console.error(`Invalid KID (alphanumeric, dash, underscore): ${kid}`);
      process.exit(1);
    }
    if (!isBase64(b64)) {
      console.error(`Key is not valid base64 for KID ${kid}`);
      process.exit(1);
    }
    const buf = Buffer.from(b64, 'base64');
    if (buf.length !== 32) {
      console.error(`Key for KID ${kid} must be 32 bytes (got ${buf.length}).`);
      process.exit(1);
    }
  }
  console.log('ENCRYPTION_KEYS format looks valid.');
}

main().catch((e) => {
  console.error('Encryption keys check error:', e.message);
  process.exit(1);
});
