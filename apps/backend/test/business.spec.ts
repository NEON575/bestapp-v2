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
import { aggregateCustomerDebt, recalculateSalesEntry } from '../src/common/business/sales-entry';
import { calculateSalesGridSummary } from '../src/common/business/sales-summary';
import { aggregateSupplierDebt, recalculatePurchaseEntry } from '../src/common/business/purchase-entry';
import { aggregateSalaryByEmployee, recalculateSalaryEntry } from '../src/common/business/salary-entry';
import { calculatePaperPricePerSheet } from '../src/common/business/paper-pricing';
import {
  applyPurchaseReceipt,
  buildPurchaseMovement,
  calculateNextAverageCost,
  calculatePackageQuantity,
  calculateStockValue,
  recalculatePurchaseFlow
} from '../src/common/business/purchase-flow';
import {
  generateMaterialCode,
  sanitizeMaterialMetadata
} from '../src/common/business/material-catalog';
import { buildPurchaseOrderBy, buildPurchaseWhere } from '../src/common/business/purchase-list';
import { normalizeCreateOrderItem } from '../src/common/business/order-items';
import {
  buildEmployeePlaceholderEmail,
  employeeAppearsInManagers,
  mapEmployeeRoleToUserRoles
} from '../src/common/business/employee-user';
import { normalizeAppLanguage, mergeAppPreferences } from '../src/common/business/app-preferences';
import { resolveApprovedById } from '../src/common/business/pricing-approval';
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

test('sales entry formulas match excel logic', () => {
  const result = recalculateSalesEntry({
    quantity: 20,
    saleAmount: 500,
    paymentAmount: 120,
    bonus: 15,
    customerBonus: 25,
    paperCost: 100,
    plateCost: 20,
    printCost: 60,
    specialCutCost: 10,
    knifeCost: 5,
    manualWorkCost: 15,
    spiralCost: 8,
    poniCost: 7,
    otherCost: 12,
    laminationCost: 18
  });

  assert.deepEqual(result, {
    saleUnitPrice: 25,
    remainingDebt: 355,
    finalRemainingDebt: 340,
    totalCost: 255,
    profit: 205,
    profitPercent: 80.39
  });
});

test('sales entry handles zero quantity and zero total cost safely', () => {
  const result = recalculateSalesEntry({
    quantity: 0,
    saleAmount: 150,
    paymentAmount: 50,
    bonus: 0,
    customerBonus: 10,
    paperCost: 0,
    plateCost: 0,
    printCost: 0,
    specialCutCost: 0,
    knifeCost: 0,
    manualWorkCost: 0,
    spiralCost: 0,
    poniCost: 0,
    otherCost: 0,
    laminationCost: 0
  });

  assert.deepEqual(result, {
    saleUnitPrice: 0,
    remainingDebt: 90,
    finalRemainingDebt: 90,
    totalCost: 0,
    profit: 140,
    profitPercent: 0
  });
});

test('customer debt aggregation sums sales journal correctly', () => {
  const rows = aggregateCustomerDebt([
    {
      customerId: 'c1',
      customerName: 'Alpha',
      saleAmount: 400,
      paymentAmount: 200,
      bonus: 10,
      customerBonus: 20,
      remainingDebt: 180,
      finalRemainingDebt: 170
    },
    {
      customerId: 'c1',
      customerName: 'Alpha',
      saleAmount: 100,
      paymentAmount: 25,
      bonus: 0,
      customerBonus: 5,
      remainingDebt: 70,
      finalRemainingDebt: 70
    }
  ]);

  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    customerId: 'c1',
    customerName: 'Alpha',
    phone: undefined,
    saleAmount: 500,
    paymentAmount: 225,
    bonus: 10,
    customerBonus: 25,
    remainingDebt: 250,
    finalRemainingDebt: 240,
    lastSaleDate: null
  });
});

test('purchase and supplier debt calculations are consistent', () => {
  const purchase = recalculatePurchaseEntry(300, 120);
  assert.deepEqual(purchase, {
    amount: 300,
    paymentAmount: 120,
    remainingDebt: 180
  });

  const supplierDebt = aggregateSupplierDebt([
    { supplierId: 's1', supplierName: 'Paper MMC', amount: 300, paymentAmount: 120, remainingDebt: 180 },
    { supplierId: 's1', supplierName: 'Paper MMC', amount: 100, paymentAmount: 20, remainingDebt: 80 }
  ]);

  assert.deepEqual(supplierDebt[0], {
    supplierId: 's1',
    supplierName: 'Paper MMC',
    purchaseAmount: 400,
    paymentAmount: 140,
    remainingDebt: 260
  });
});

test('purchase list where clause keeps deleted rows hidden and respects day range', () => {
  const where = buildPurchaseWhere({
    search: 'kağız',
    supplierId: 'supplier-1',
    paymentType: 'hesab',
    onlyDebtors: true,
    dateFrom: '2026-06-01',
    dateTo: '2026-06-04'
  });

  assert.equal(where.deletedAt, null);
  assert.equal((where as any).supplierId, 'supplier-1');
  assert.equal((where as any).paymentType, 'hesab');
  assert.equal((where as any).remainingDebt.gt, 0);
  assert.equal((where as any).date.gte.toISOString(), '2026-06-01T00:00:00.000Z');
  assert.equal((where as any).date.lte.toISOString(), '2026-06-04T23:59:59.999Z');
});

test('purchase list ordering keeps newest rows first', () => {
  assert.deepEqual(buildPurchaseOrderBy(), [{ date: 'desc' }, { createdAt: 'desc' }]);
  assert.deepEqual(buildPurchaseOrderBy('createdAt', 'asc'), [{ createdAt: 'asc' }]);
  assert.deepEqual(buildPurchaseOrderBy('amount', 'asc'), [{ amount: 'asc' }, { createdAt: 'desc' }]);
});

test('package quantity calculation supports packaging conversion', () => {
  assert.equal(calculatePackageQuantity(3, 500, 0), 1500);
  assert.equal(calculatePackageQuantity(undefined, undefined, 120), 120);
});

test('purchase recalculation derives total amount, unit price and debt', () => {
  const result = recalculatePurchaseFlow({
    packageQuantity: 3,
    unitsPerPackage: 500,
    unitPrice: 0.42,
    paymentAmount: 200
  });

  assert.deepEqual(result, {
    totalQuantity: 1500,
    unitPrice: 0.42,
    totalAmount: 630,
    paymentAmount: 200,
    remainingDebt: 430
  });

  const reverse = recalculatePurchaseFlow({
    quantity: 100,
    totalAmount: 55,
    paymentAmount: 5
  });

  assert.deepEqual(reverse, {
    totalQuantity: 100,
    unitPrice: 0.55,
    totalAmount: 55,
    paymentAmount: 5,
    remainingDebt: 50
  });
});

test('purchase helper produces purchase_in stock movement payload', () => {
  const movement = buildPurchaseMovement({
    materialId: 'm1',
    warehouseId: 'w1',
    totalQuantity: 1500,
    unitPrice: 0.42,
    totalAmount: 630,
    reference: 'purchase:p1',
    note: 'A3 kağız'
  });

  assert.deepEqual(movement, {
    type: 'purchase_in',
    materialId: 'm1',
    warehouseId: 'w1',
    quantity: 1500,
    balanceDelta: 1500,
    unitCost: 0.42,
    totalCost: 630,
    reference: 'purchase:p1',
    note: 'A3 kağız'
  });
});

test('purchase receipt increases stock and updates material price snapshots', () => {
  const applied = applyPurchaseReceipt({
    currentOnHand: 500,
    currentAverageCost: 0.35,
    incomingQuantity: 1500,
    incomingUnitPrice: 0.42,
    paymentAmount: 200
  });

  assert.deepEqual(applied, {
    onHand: 2000,
    lastPurchasePrice: 0.42,
    averageCost: 0.4025,
    totalAmount: 630,
    paymentAmount: 200,
    remainingDebt: 430,
    stockValue: 805
  });
});

test('average cost and stock value are calculated after purchase', () => {
  assert.equal(
    calculateNextAverageCost({
      currentOnHand: 500,
      currentAverageCost: 0.35,
      incomingQuantity: 1500,
      incomingUnitPrice: 0.42
    }),
    0.4025
  );
  assert.equal(calculateStockValue(2000, 0.4025), 805);
});

test('stock summary after purchase stays structurally correct', () => {
  const applied = applyPurchaseReceipt({
    currentOnHand: 0,
    currentAverageCost: 0,
    incomingQuantity: 1500,
    incomingUnitPrice: 0.42,
    paymentAmount: 100
  });

  const summary = calculateInventorySummary({
    totalMaterials: 1,
    lowStockCount: 0,
    totalStockValue: applied.stockValue,
    reservedValue: 0,
    materialsBelowMinimum: [],
    recentMovements: [
      buildPurchaseMovement({
        materialId: 'm1',
        warehouseId: 'w1',
        totalQuantity: 1500,
        unitPrice: 0.42,
        totalAmount: 630
      })
    ]
  });

  assert.equal(summary.totalStockValue, 630);
  assert.equal(summary.recentMovements[0]?.type, 'purchase_in');
});

test('salary recalculation matches excel balance logic', () => {
  const salary = recalculateSalaryEntry(700, 50, 500);
  assert.deepEqual(salary, {
    salaryAmount: 700,
    bonusAmount: 50,
    paymentAmount: 500,
    remainingDebt: 250
  });

  const summary = aggregateSalaryByEmployee([
    {
      employeeId: 'e1',
      employeeName: 'Aysel',
      salaryAmount: 700,
      bonusAmount: 50,
      paymentAmount: 500,
      remainingDebt: 250
    },
    {
      employeeId: 'e1',
      employeeName: 'Aysel',
      salaryAmount: 300,
      bonusAmount: 0,
      paymentAmount: 100,
      remainingDebt: 200
    }
  ]);

  assert.deepEqual(summary[0], {
    employeeId: 'e1',
    employeeName: 'Aysel',
    salaryAmount: 1000,
    bonusAmount: 50,
    paymentAmount: 600,
    remainingDebt: 450
  });
});

test('paper price per sheet follows excel logic', () => {
  assert.equal(calculatePaperPricePerSheet(42, 250), 0.168);
  assert.equal(calculatePaperPricePerSheet(18, 100), 0.18);
  assert.equal(calculatePaperPricePerSheet(10, 0), 0);
});

test('material code generation uses category prefix', () => {
  assert.equal(generateMaterialCode('KAG', 1), 'KAG-0001');
  assert.equal(generateMaterialCode('lam', 24), 'LAM-0024');
});

test('material dynamic metadata validation keeps allowed values', () => {
  const metadata = sanitizeMaterialMetadata(
    [
      { key: 'gram', label: 'Qram', type: 'number' },
      {
        key: 'type',
        label: 'Tip',
        type: 'select',
        options: [
          { label: 'Parlaq', value: 'parlaq' },
          { label: 'Mat', value: 'mat' }
        ]
      }
    ],
    {
      gram: '300',
      type: 'mat',
      ignored: 'x'
    }
  );

  assert.deepEqual(metadata, {
    gram: 300,
    type: 'mat'
  });
});

test('order create works without productType and material', () => {
  const item = normalizeCreateOrderItem({
    name: 'Vizit kartı',
    quantity: 1000,
    formatText: '90x50',
    printColorText: '4+4'
  } as any);

  assert.equal(item.productType, 'print_job');
  assert.equal(item.materialId, null);
  assert.equal(item.unitPrice, 0);
  assert.equal(item.totalPrice, 0);
  assert.equal(item.formatText, '90x50');
  assert.equal(item.printColorText, '4+4');
});

test('employees created in settings map to manager-capable users correctly', () => {
  assert.deepEqual(mapEmployeeRoleToUserRoles('manager'), ['manager']);
  assert.deepEqual(mapEmployeeRoleToUserRoles('owner'), ['owner']);
  assert.deepEqual(mapEmployeeRoleToUserRoles('other'), []);
  assert.equal(employeeAppearsInManagers('manager'), true);
  assert.equal(employeeAppearsInManagers('owner'), true);
  assert.equal(employeeAppearsInManagers('production'), false);
  assert.equal(buildEmployeePlaceholderEmail('Aysel Məmmədova', '12345678-aaaa-bbbb-cccc-dddddddddddd').endsWith('@bestapp.local'), true);
});

test('approve order keeps approvedById only for real users', () => {
  assert.equal(resolveApprovedById({ requestedUserId: 'u1', existingUserId: 'u1' }), 'u1');
  assert.equal(resolveApprovedById({ requestedUserId: 'u1', existingUserId: 'u2' }), null);
  assert.equal(resolveApprovedById({ requestedUserId: 'u1', existingUserId: null }), null);
});

test('language settings normalize and persist valid ui language', () => {
  assert.equal(normalizeAppLanguage(undefined), 'az');
  assert.equal(normalizeAppLanguage('ru'), 'ru');
  assert.deepEqual(mergeAppPreferences({ theme: 'light' }, { language: 'ru' }), {
    theme: 'light',
    language: 'ru'
  });
  assert.deepEqual(mergeAppPreferences({ language: 'ru' }, { language: 'invalid' }), {
    language: 'az'
  });
});

test('sales summary totals keep filtered excel scenarios consistent', () => {
  const rows = [
    {
      saleAmount: 180,
      paymentAmount: 180,
      bonus: 0,
      customerBonus: 0,
      remainingDebt: 0,
      finalRemainingDebt: 0,
      totalCost: 70,
      profit: 110,
      profitPercent: 157.14,
      deliveryStatus: 'tehvil'
    },
    {
      saleAmount: 420,
      paymentAmount: 200,
      bonus: 10,
      customerBonus: 20,
      remainingDebt: 200,
      finalRemainingDebt: 190,
      totalCost: 228,
      profit: 162,
      profitPercent: 71.05,
      deliveryStatus: 'hazir'
    },
    {
      saleAmount: 150,
      paymentAmount: 50,
      bonus: 5,
      customerBonus: 0,
      remainingDebt: 100,
      finalRemainingDebt: 95,
      totalCost: 165,
      profit: -20,
      profitPercent: -12.12,
      deliveryStatus: 'hazir'
    }
  ];

  const summary = calculateSalesGridSummary(rows.filter((row) => row.deliveryStatus === 'hazir'));

  assert.deepEqual(summary, {
    totalSaleAmount: 570,
    totalPaymentAmount: 250,
    totalBonus: 15,
    totalCustomerBonus: 20,
    totalRemainingDebt: 300,
    totalFinalRemainingDebt: 285,
    totalCost: 393,
    totalProfit: 142,
    averageProfitPercent: 29.47,
    rows: 2
  });
});
