import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus } from '@prisma/client';
import { assertOrderStatusTransition } from '../src/common/business/order-status';
import { applyConsume, applyRelease, applyReserve } from '../src/common/business/inventory-flow';
import { calculateOrderProfitability } from '../src/common/business/profitability';
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
