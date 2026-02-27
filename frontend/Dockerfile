FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

EXPOSE 3000

CMD ["npm", "run", "dev"]
