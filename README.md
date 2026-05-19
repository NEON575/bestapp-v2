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

## How to run on Windows without Docker

If Docker Desktop or WSL is unstable on your machine, use the local Windows flow:

1. Install Node.js LTS.
2. Install PostgreSQL locally.
3. Create the `bestapp` database.
4. Run `npm run setup:local` to create local `.env` files from examples.
5. Run `npm run prisma:generate -w @bestapp/backend`.
6. Run `npm run db:migrate`.
7. Run `npm run db:seed`.
8. Start the backend with `npm run dev:backend`.
9. Start the frontend with `npm run dev:frontend`.

See [`WINDOWS_LOCAL_RUN.md`](./WINDOWS_LOCAL_RUN.md) for the full Russian step-by-step guide.

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
- `POST /api/v1/inventory/reservations/:id/release`
- `POST /api/v1/inventory/reservations/:id/consume`
- `POST /api/v1/inventory/write-off`
- `POST /api/v1/finance/payments`
- `GET /api/v1/orders/:id/profitability`

## Phase 2.2 scope

The backend now enforces transaction-safe and accounting-safe workflows for the printing house.

### Transaction-safe flows

- order creation
- price calculation
- price approval
- start production
- stock reservation
- stock release
- stock consumption / write-off
- invoice creation
- payment creation
- payment reversal
- order delivery

### Inventory rules

- `purchase_in` increases `onHand`
- `write_off` decreases `onHand`
- `waste` decreases `onHand`
- `return` increases `onHand`
- `adjustment` can increase or decrease `onHand`
- `reserve` does not change `onHand`
- `reserve` increases `reserved`
- `available = onHand - reserved`

### Reservation lifecycle

- `open`
- `reserved`
- `released`
- `consumed`
- `cancelled`

### Finance rules

- payments are processed in a single transaction
- partial and full payments update invoice, receivable and order balances
- cash payments create cashbox transactions
- payment reversal performs a reverse flow, not a soft delete
- overpayment is rejected
- debt state is synchronized after each payment event

### Order workflow rules

- allowed status transitions are enforced in the backend
- invalid direct jumps are rejected
- profitability is stored on the order and exposed by the API

## Phase 2.3 scope

The backend now exposes a frontend-friendly API usability layer.

### List endpoints with pagination

- `GET /api/v1/orders`
- `GET /api/v1/customers`
- `GET /api/v1/inventory/materials`
- `GET /api/v1/inventory/movements`
- `GET /api/v1/production/jobs`
- `GET /api/v1/finance/invoices`
- `GET /api/v1/finance/payments`
- `GET /api/v1/debts/receivables`
- `GET /api/v1/debts/payables`

All list endpoints use the same pagination response format:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 1
  }
}
```

### Dashboard and board endpoints

- `GET /api/v1/analytics/dashboard`
- `GET /api/v1/production/board`
- `GET /api/v1/inventory/summary`
- `GET /api/v1/finance/summary`

### Order detail

`GET /api/v1/orders/:id` now returns the full order card with:

- customer and manager
- items
- cost calculation
- price versions
- production routes and jobs
- stock reservations and movements
- invoices and payments
- receivable
- profitability
- audit history

### Common query fields

- `page`
- `limit`
- `search`
- `sortBy`
- `sortOrder`
- `dateFrom`
- `dateTo`

### Order filters

- `status`
- `customerId`
- `managerId`
- `deadlineFrom`
- `deadlineTo`
- `hasDebt`
- `inProduction`
- `overdue`
