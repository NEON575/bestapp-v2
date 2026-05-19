import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus } from '@prisma/client';
import { assertOrderStatusTransition } from '../src/common/business/order-status';
import { applyConsume, applyRelease, applyReserve } from '../src/common/business/inventory-flow';
import { calculateOrderProfitability } from '../src/common/business/profitability';
import { buildPaginatedResponse, normalizePagination } from '../src/common/query/pagination';
import { buildOrderListWhere } from '../src/common/business/order-filters';
import { calculateDashboardSummary } from '../src/common/business/dashboard-summary';
import { calculateInventorySummary } from '../src/common/business/inventory-summary';
import { calculateFinanceSummary } from '../src/common/business/finance-summary';
import {
  resolveDebtStatus,
  resolveInvoiceStatus,
  assertNoOverpayment
} from '../src/common/business/finance-rules';

test('invalid order status transition is rejected', () => {
  assert.throws(() => assertOrderStatusTransition(OrderStatus.draft, OrderStatus.delivered));
});

test('inventory reserve, release and consume update balances correctly', () => {
  const reserved = applyReserve({ onHand: 100, reserved: 10 }, 25);
  assert.deepEqual(reserved, { onHand: 100, reserved: 35, available: 65 });

  const released = applyRelease(reserved, 15);
  assert.deepEqual(released, { onHand: 100, reserved: 20, available: 80 });

  const consumed = applyConsume(released, 20);
  assert.deepEqual(consumed, { onHand: 80, reserved: 0, available: 80 });
});

test('payment partial and full states are resolved correctly', () => {
  assert.equal(resolveInvoiceStatus(0, 100), 'issued');
  assert.equal(resolveInvoiceStatus(30, 100), 'partially_paid');
  assert.equal(resolveInvoiceStatus(100, 100), 'paid');
  assert.equal(resolveDebtStatus(0, 100), 'open');
  assert.equal(resolveDebtStatus(30, 100), 'partial');
  assert.equal(resolveDebtStatus(100, 100), 'closed');
});

test('overpayment protection throws', () => {
  assert.throws(() => assertNoOverpayment(100, 60, 50));
});

test('order profitability is computed from totals', () => {
  const result = calculateOrderProfitability({
    totalAmount: 200,
    costAmount: 150,
    paidAmount: 120
  });

  assert.deepEqual(result, {
    netProfit: 50,
    marginPercent: 25,
    customerDebtAmount: 80,
    isProfitable: true
  });
});

test('pagination helper normalizes query and creates meta', () => {
  const pagination = normalizePagination({ page: 2, limit: 15 });
  assert.deepEqual(pagination, { page: 2, limit: 15, skip: 15, take: 15 });

  const response = buildPaginatedResponse(['a', 'b'], 40, 2, 15);
  assert.deepEqual(response.meta, {
    page: 2,
    limit: 15,
    total: 40,
    totalPages: 3
  });
});

test('order filters build expected where clauses', () => {
  const where = buildOrderListWhere({
    page: 1,
    limit: 20,
    search: 'alpha',
    status: 'approved',
    customerId: 'customer-1',
    managerId: 'manager-1',
    deadlineFrom: '2026-01-01T00:00:00.000Z',
    deadlineTo: '2026-01-31T23:59:59.999Z',
    hasDebt: true,
    inProduction: false,
    overdue: false
  } as any, new Date('2026-01-15T00:00:00.000Z'));

  assert.ok(where.AND);
  assert.equal(where.deletedAt, null);
});

test('dashboard summary calculation keeps totals intact', () => {
  const summary = calculateDashboardSummary({
    totalOrders: 10,
    ordersInProduction: 2,
    readyOrders: 3,
    overdueOrders: 1,
    totalRevenue: 1000,
    totalPaid: 700,
    totalDebt: 300,
    cashboxBalance: 500,
    lowStockMaterials: 4,
    todayPayments: 120,
    monthRevenue: 800,
    monthProfit: 240,
    topCustomers: [{ id: 'c1', name: 'Client', totalAmount: 500 }],
    recentOrders: [],
    recentPayments: []
  });

  assert.equal(summary.totalOrders, 10);
  assert.equal(summary.totalDebt, 300);
  assert.equal(summary.monthProfit, 240);
});

test('inventory summary returns structured payload', () => {
  const summary = calculateInventorySummary({
    totalMaterials: 3,
    lowStockCount: 1,
    totalStockValue: 100,
    reservedValue: 25,
    materialsBelowMinimum: [{ id: 'm1' }],
    recentMovements: [{ id: 'mv1' }]
  });

  assert.equal(summary.lowStockCount, 1);
  assert.equal(summary.totalStockValue, 100);
});

test('finance summary returns structured payload', () => {
  const summary = calculateFinanceSummary({
    totalInvoices: 10,
    unpaidInvoices: 3,
    overdueInvoices: 1,
    totalReceivables: 250,
    totalPayables: 120,
    totalCashboxBalance: 600,
    todayIncome: 80,
    todayExpense: 15,
    monthIncome: 900,
    monthExpense: 140
  });

  assert.equal(summary.totalInvoices, 10);
  assert.equal(summary.totalCashboxBalance, 600);
  assert.equal(summary.monthExpense, 140);
});
