FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package.json
COPY tsconfig.base.json tsconfig.base.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm install

FROM base AS build
COPY . .
RUN npm run build -w @bestapp/frontend

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/apps/frontend/package.json /app/apps/frontend/package.json
COPY --from=build /app/packages/shared/package.json /app/packages/shared/package.json
COPY --from=build /app/packages/ui/package.json /app/packages/ui/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/frontend/dist /app/apps/frontend/dist
EXPOSE 5173
CMD ["npm", "run", "preview", "-w", "@bestapp/frontend", "--", "--host", "0.0.0.0", "--port", "5173"]
