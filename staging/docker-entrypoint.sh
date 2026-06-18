#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  case "$DATABASE_URL" in
    file:*)
      mkdir -p /app/prisma
      ;;
    *)
      echo "Waiting for database..."
      until node -e "const net=require('net'); const u=new URL(process.env.DATABASE_URL); const port=Number(u.port || 3306); const socket=net.createConnection({ host: u.hostname, port }, () => process.exit(0)); socket.on('error', () => process.exit(1)); socket.setTimeout(1000, () => process.exit(1));"; do
        sleep 2
      done
      ;;
  esac

  echo "Applying Prisma schema..."
  npx prisma db push
fi

exec "$@"
