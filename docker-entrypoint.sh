#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Generating Prisma client from mounted schema..."
  npx prisma generate

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

  if [ "${RUN_PRISMA_DB_PUSH:-}" = "false" ]; then
    echo "RUN_PRISMA_DB_PUSH=false; skipping Prisma db push."
  else
    if [ -n "${sqlite_path:-}" ] && [ -f "$sqlite_path" ]; then
      backup_path="${sqlite_path}.backup-$(date +%Y%m%d-%H%M%S)"
      cp "$sqlite_path" "$backup_path"
      echo "SQLite backup created before schema sync: $backup_path"
    fi

    echo "Syncing Prisma schema without accepting data loss..."
    if npx prisma db push; then
      echo "Prisma schema sync completed."
    else
      echo "Prisma schema sync failed. Continuing without --accept-data-loss to preserve existing data."
    fi
  fi
fi

exec "$@"
