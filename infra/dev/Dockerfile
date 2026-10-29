# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@12.16.1

WORKDIR /app

FROM base AS deps

COPY . .
RUN pnpm install --frozen-lockfile
ENV PATH="/app/node_modules/.bin:$PATH"

FROM deps AS workspace

FROM deps AS api

CMD ["pnpm", "--filter", "@t1/api", "dev"]
