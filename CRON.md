# Cron Setup

This project no longer depends on Vercel cron for fixtures sync.

Use the built-in script:

```bash
npm run cron:fixtures
```

It calls:

`POST /api/commissioner/sync/fixtures`

using `CRON_SECRET` or `AUTH_SECRET` from your `.env*` files.

Optional env:

- `CRON_BASE_URL`
- `APP_BASE_URL`
- `NEXT_PUBLIC_APP_URL`

If none are set, the script uses `http://127.0.0.1:3000`.

Example crontab entry for every 5 minutes:

```cron
*/5 * * * * cd /Users/bosana/fifa-prediction/next-app && /usr/bin/env npm run cron:fixtures >> /tmp/fifa-fixtures-cron.log 2>&1
```

Make sure your Next.js server is already running when cron executes.
