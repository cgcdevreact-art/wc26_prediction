# Docker Deployment

This project uses Prisma with SQLite:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Docker Compose reads secrets and runtime values from `.env`.

With the provided `.env`:

```env
DATABASE_URL="file:./dev.db"
```

Prisma resolves that SQLite path relative to `prisma/schema.prisma`, so inside Docker the DB file is:

```txt
/app/prisma/dev.db
```

Compose bind-mounts `./prisma` from the server directory to `/app/prisma`, so the DB file remains in the server project directory at:

```txt
./prisma/dev.db
```

## Local or Server Start

```bash
docker compose up -d --build
```

The app will be available on `http://localhost:4000`.

On first boot, the app container uses `.env`, ensures `/app/prisma` exists, and creates the schema only if the SQLite database file does not already exist:

```bash
npx prisma db push
```

That creates the SQLite tables from `prisma/schema.prisma` for a fresh DB.

If `prisma/dev.db` already exists, startup skips `prisma db push` to avoid destructive schema changes such as dropping non-empty tables that are not present in the current Prisma schema.

## Required `.env`

Place `.env` in the project root, next to `docker-compose.yml`:

```txt
/home/ubuntu/wc26_prediction/staging/.env
```

Expected variables from the developer:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-super-secret-nextauth-key-change-in-production"
AUTH_URL="http://localhost:4000"
AUTH_TRUST_HOST="true"
FOOTBALL_DATA_API_KEY=""

NEXT_PUBLIC_APP_URL="http://localhost:4000"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_PRICE_PLUS_ID=""
STRIPE_PRICE_PRO_ID=""
```

For production, update URLs to the real domain:

```env
AUTH_URL="https://your-domain.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

If you are hosting directly on server IP without a domain, use port `4000`:

```env
AUTH_URL="http://SERVER_IP:4000"
NEXT_PUBLIC_APP_URL="http://SERVER_IP:4000"
```

Optional features need these only if you use them:

- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS_ID`, `STRIPE_PRICE_PRO_ID`
- Football data sync: `FOOTBALL_DATA_API_KEY`

Note: the Docker build stage sets a dummy `STRIPE_SECRET_KEY` only so Next.js can compile API routes that import Stripe. At runtime, the real value still comes from `.env`.

## Database Notes

The SQLite database file is:

```txt
./prisma/dev.db
```

Because `./prisma` is bind-mounted, this file is part of the server directory and can be backed up or synced with your normal deployment/backup process.

For staging CI/CD, the workflow deploys to:

```txt
/home/ubuntu/wc26_prediction/staging
```

It uses this Docker Compose project name:

```txt
wc26-staging
```

The workflow preserves the server-side `.env` and SQLite DB. It removes any repository `prisma/dev.db` from the deploy payload before copying files, then stores DB backups under:

```txt
/home/ubuntu/wc26_prediction/backups
```

Normal rebuilds should not delete data because the DB file lives on the server at `/home/ubuntu/wc26_prediction/staging/prisma/dev.db`, outside the rebuilt image.

For the first staging CI/CD run, if `/home/ubuntu/wc26_prediction/staging/.env` or `/home/ubuntu/wc26_prediction/staging/prisma/dev.db` do not exist yet, the workflow copies them from the old manual path under `/home/ubuntu/wc26_prediction/main` when available.

Do not use `prisma db push --accept-data-loss` on the live DB unless you have intentionally decided to drop the warned tables/columns and have a verified backup.

## Fresh Database Setup

If you do not want to use any existing SQLite database, remove `prisma/dev.db` before starting the container:

```bash
cd /home/ubuntu/wc26_prediction/staging
rm -f prisma/dev.db
docker compose up -d --build
```

On startup, `docker-entrypoint.sh` runs:

```bash
npx prisma db push
```

That creates a fresh `prisma/dev.db` file with all tables from `prisma/schema.prisma`.

Important: `prisma/dev.db` currently exists in this repository. If the server receives it through Git or file sync, delete it once before the first production start to force a clean DB.

To reset the Docker SQLite database completely:

```bash
docker compose down
rm -f prisma/dev.db
docker compose up -d --build
```

To inspect logs:

```bash
docker compose logs -f app
```
