import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const baseUrl =
  process.env.CRON_BASE_URL ||
  process.env.APP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3000";

const cronSecret = process.env.CRON_SECRET || process.env.AUTH_SECRET;

if (!cronSecret) {
  console.error("CRON_SECRET or AUTH_SECRET must be set for fixture cron sync.");
  process.exit(1);
}

const url = new URL("/api/admin/sync/fixtures", baseUrl).toString();

try {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cronSecret}`,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    console.error(`Fixture cron sync failed: ${response.status} ${response.statusText}`);
    console.error(text);
    process.exit(1);
  }

  console.log(text);
} catch (error) {
  console.error("Fixture cron sync request failed:", error);
  process.exit(1);
}
