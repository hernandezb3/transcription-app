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

COPY frontend/package.json frontend/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

EXPOSE 3000

# ── Dev: hot reload via next dev ──
FROM base AS dev
CMD ["npm", "run", "dev"]

# ── Prod: build then serve ──
FROM base AS build
COPY frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
RUN date -u +"%Y-%m-%dT%H:%M:%SZ" > /app/.build-date

FROM node:20-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG AppEnvironment
ARG BuildNumber
ARG BuildId
ARG BuildUser
ENV AppEnvironment=${AppEnvironment}
ENV BuildNumber=${BuildNumber}
ENV BuildId=${BuildId}
ENV BuildUser=${BuildUser}

# Trust X-Forwarded-Host from Azure App Service reverse proxy
# so NextAuth builds correct callback URLs instead of using the container hostname
ENV AUTH_TRUST_HOST=true
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/.build-date ./.build-date
EXPOSE 3000
CMD ["node", "server.js"]
