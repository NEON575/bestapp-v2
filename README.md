# BestApp ERP / MIS

Enterprise ERP/MIS skeleton for a full-cycle printing house.

## What is included

- NestJS backend foundation
- React + TypeScript + Vite frontend shell
- PostgreSQL + Prisma schema and seed data
- JWT authentication
- RBAC foundation
- Swagger setup
- Validation and global error handling
- Audit logging foundation
- Soft delete foundation
- Docker Compose for local development

## Default stack

- Backend: NestJS, TypeScript, Prisma
- Frontend: React, TypeScript, Vite, TailwindCSS
- Database: PostgreSQL
- Auth: JWT + RBAC
- Deployment: Docker

## How to install

```bash
npm install
```

## How to run

```bash
npm run dev
```

This starts:

- backend on `http://localhost:3000`
- frontend on `http://localhost:5173`

## How to run with Docker

```bash
docker compose up --build
```

## How to migrate database

```bash
npm run db:migrate
```

## How to seed database

```bash
npm run db:seed
```

## Default login/password

- Email: `admin@bestapp.local`
- Password: `Admin123!`

## Project structure

```txt
apps/
  backend/
  frontend/
packages/
  shared/
  ui/
infra/
docs/
```

## Why Prisma

Prisma is used instead of TypeORM because:

- better type safety
- clearer schema and relations
- easier migrations
- cleaner data access for a modular monolith
- less boilerplate for domain CRUD foundation

