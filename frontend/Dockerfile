FROM node:20-slim AS base

ARG AppEnvironment
ARG BuildNumber
ARG BuildId
ARG BuildUser

ENV AppEnvironment=${AppEnvironment}
ENV BuildNumber=${BuildNumber}
ENV BuildId=${BuildId}
ENV BuildUser=${BuildUser}

WORKDIR /app

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

EXPOSE 3000

# ── Dev: hot reload via next dev ──
FROM base AS dev
CMD ["npm", "run", "dev"]

# ── Prod: build then serve ──
FROM base AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
