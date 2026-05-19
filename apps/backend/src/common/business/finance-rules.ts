import { DebtStatus, InvoiceStatus } from '@prisma/client';
import { InvoiceOverpaymentException } from './exceptions';

export function resolveDebtStatus(paidAmount: number, totalAmount: number, dueAt?: Date | null) {
  if (paidAmount <= 0) {
    if (dueAt && dueAt.getTime() < Date.now()) {
      return DebtStatus.overdue;
    }
    return DebtStatus.open;
  }

  if (paidAmount >= totalAmount) {
    return DebtStatus.closed;
  }

  if (dueAt && dueAt.getTime() < Date.now()) {
    return DebtStatus.overdue;
  }

  return DebtStatus.partial;
}

export function resolveInvoiceStatus(paidAmount: number, totalAmount: number, dueAt?: Date | null) {
  if (paidAmount <= 0) {
    return dueAt && dueAt.getTime() < Date.now() ? InvoiceStatus.overdue : InvoiceStatus.issued;
  }

  if (paidAmount >= totalAmount) {
    return InvoiceStatus.paid;
  }

  return dueAt && dueAt.getTime() < Date.now() ? InvoiceStatus.overdue : InvoiceStatus.partially_paid;
}

export function assertNoOverpayment(totalAmount: number, paidAmount: number, incomingAmount: number) {
  if (paidAmount + incomingAmount > totalAmount) {
    throw new InvoiceOverpaymentException();
  }
}
