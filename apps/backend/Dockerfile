FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package.json
COPY tsconfig.base.json tsconfig.base.json
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm install

FROM base AS build
COPY . .
RUN npm run prisma:generate -w @bestapp/backend
RUN npm run build -w @bestapp/backend

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/backend/dist /app/apps/backend/dist
COPY --from=build /app/apps/backend/prisma /app/apps/backend/prisma
EXPOSE 3000
CMD ["node", "apps/backend/dist/main.js"]

