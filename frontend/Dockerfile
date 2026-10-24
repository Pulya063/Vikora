FROM node:22-bookworm-slim AS build
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Static pages import the shared catalog and pricing from /shared.
COPY shared/ /app/shared/
ARG API_URL=http://app:8000
ARG NEXT_PUBLIC_BACKEND_MODE=legacy
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ARG NEXT_PUBLIC_TURNSTILE_BYPASS=false
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG ALLOW_INDEXING=false
ENV API_URL=$API_URL \
    NEXT_PUBLIC_BACKEND_MODE=$NEXT_PUBLIC_BACKEND_MODE \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_TURNSTILE_BYPASS=$NEXT_PUBLIC_TURNSTILE_BYPASS \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    ALLOW_INDEXING=$ALLOW_INDEXING
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app/frontend
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    API_URL=http://app:8000
COPY --from=build --chown=node:node /app/frontend/package.json ./package.json
COPY --from=build --chown=node:node /app/frontend/node_modules ./node_modules
COPY --from=build --chown=node:node /app/frontend/.next ./.next
COPY --from=build --chown=node:node /app/frontend/public ./public
USER node
EXPOSE 3000
CMD ["sh", "-c", "exec node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port \"${PORT:-3000}\""]
