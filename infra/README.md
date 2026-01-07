# infra

Docker Compose and infra configuration.

## Local services

Dockerized Postgres and Redis for development.

1. Copy envs:
	 - cp infra/.env.example .env.local
	 - cp .env.example .env
	 - cp apps/web/.env.example apps/web/.env.local
	 - cp apps/worker/.env.example apps/worker/.env.local
2. Start services:
	 - docker compose -f infra/docker-compose.yml up -d

DATABASE_URL (local): postgresql://clinic:clinic@localhost:5432/clinic
REDIS_URL (local): redis://localhost:6379

## Cloud projects

- Supabase: create three projects (dev, staging, prod)
	- Get SUPABASE_URL and keys (ANON and SERVICE_ROLE)
	- Set DATABASE_URL for cloud Postgres (from Supabase)
- Vercel: create two projects (staging and production) for apps/web
	- Link GitHub and configure envs per environment
- Redis: choose managed (Upstash/Redis Cloud) or self-managed

## Environment variables

Required keys:

- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE
- DATABASE_URL (local + cloud)
- REDIS_URL
- SENTRY_DSN, LOGTAIL_TOKEN (or Better Stack)
- APP_BASE_URL (local/staging/prod)
- ENCRYPTION_KEYS (optional, format: KID:BASE64[,KID2:BASE64])

## Secrets management policy

- No secrets in repo. Use Vercel Environment Variables for apps/web.
- For local dev, use .env.local files (gitignored).
- For shared secrets, prefer 1Password or Doppler. Rotate keys upon exposure.

