ARG NODE_IMAGE=node:22.21.1-alpine3.22

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apk upgrade --no-cache
COPY package.json package-lock.json ./
RUN npm ci

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
RUN apk upgrade --no-cache
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:./dev.db
ENV AUTH_SECRET=docker-build-placeholder-change-at-runtime
ENV STRIPE_SECRET_KEY=sk_test_docker_build_placeholder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
RUN apk upgrade --no-cache
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
