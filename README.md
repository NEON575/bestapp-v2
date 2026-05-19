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

## Phase 2.1 scope

The backend and database now include a printing-house foundation for:

- order lifecycle and profitability tracking
- pricing and cost calculation versions
- inventory reservations, write-off, and stock movements
- production routes, operations, machines, and work centers
- invoices, payments, receivables, payables, and cashboxes
- audit logs for critical business actions

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

This applies the current Prisma schema, including the printing-house workflow upgrade.

## How to seed database

```bash
npm run db:seed
```

Seed data includes:

- Super Admin, Owner, Manager, Accountant, Warehouse, Production, and Cashier roles
- a test admin user
- default material categories, warehouses, work centers, operation templates, machines, and markup rules

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

## Core API areas

- `orders`
- `customers`
- `materials`
- `inventory`
- `production`
- `finance`
- `audit`

## Default workflow endpoints

- `POST /api/v1/orders/:id/calculate-price`
- `POST /api/v1/orders/:id/approve`
- `POST /api/v1/orders/:id/start-production`
- `POST /api/v1/orders/:id/mark-ready`
- `POST /api/v1/orders/:id/deliver`
- `POST /api/v1/inventory/reserve`
- `POST /api/v1/inventory/write-off`
- `POST /api/v1/finance/payments`
- `GET /api/v1/orders/:id/profitability`
