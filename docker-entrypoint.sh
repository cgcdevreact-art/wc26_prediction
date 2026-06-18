#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  case "$DATABASE_URL" in
    file:*)
      mkdir -p /app/prisma
      db_path="${DATABASE_URL#file:}"
      case "$db_path" in
        /*) sqlite_path="$db_path" ;;
        *) sqlite_path="/app/prisma/$db_path" ;;
      esac
      ;;
    *)
      echo "Waiting for database..."
      until node -e "const net=require('net'); const u=new URL(process.env.DATABASE_URL); const port=Number(u.port || 3306); const socket=net.createConnection({ host: u.hostname, port }, () => process.exit(0)); socket.on('error', () => process.exit(1)); socket.setTimeout(1000, () => process.exit(1));"; do
        sleep 2
      done
      ;;
  esac

  if [ "${RUN_PRISMA_DB_PUSH:-}" = "true" ]; then
    echo "RUN_PRISMA_DB_PUSH=true; applying Prisma schema..."
    npx prisma db push
  elif [ -n "${sqlite_path:-}" ] && [ ! -f "$sqlite_path" ]; then
    echo "SQLite database not found at $sqlite_path; creating schema..."
    npx prisma db push
  else
    echo "Existing database detected; skipping Prisma db push to avoid data loss."
  fi
fi

exec "$@"
