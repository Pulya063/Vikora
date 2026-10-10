FROM node:22-bookworm-slim AS build
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@10
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
# Static pages import the shared catalog directly from the backend.
COPY backend/app/config/ /app/backend/app/config/
ARG API_URL=http://app:8000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG ALLOW_INDEXING=false
ENV API_URL=$API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    ALLOW_INDEXING=$ALLOW_INDEXING
RUN pnpm build
RUN pnpm prune --prod

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
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
