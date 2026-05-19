import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DebtStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  CashboxTransactionType
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationQueryDto } from '../../common/query/pagination.dto';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import { calculateFinanceSummary } from '../../common/business/finance-summary';
import {
  CreateCashboxDto,
  CreateInvoiceDto,
  CreatePaymentDto,
  UpdateCashboxDto,
  UpdateInvoiceDto
} from './dto/finance.dto';
import {
  PaymentAlreadyReversedException
} from '../../common/business/exceptions';
import {
  assertNoOverpayment,
  resolveDebtStatus,
  resolveInvoiceStatus
} from '../../common/business/finance-rules';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private db(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  private async ensureInvoice(id: string, tx?: Prisma.TransactionClient) {
    const invoice = await this.db(tx).invoice.findFirst({
      where: { id, deletedAt: null },
      include: { order: true, payments: true, receivable: true }
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  private async syncOrderAndDebt(
    tx: Prisma.TransactionClient,
    invoice: { id: string; orderId: string; totalAmount: number; paidAmount: number; dueAt?: Date | null }
  ) {
    const paidAmount = invoice.paidAmount;
    const totalAmount = invoice.totalAmount;
    const order = await tx.order.findUnique({ where: { id: invoice.orderId } });

    if (order) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paidAmount,
          customerDebtAmount: Math.max(totalAmount - paidAmount, 0)
        }
      });
    }

    await tx.receivable.updateMany({
      where: { invoiceId: invoice.id },
      data: {
        paidAmount,
        status: resolveDebtStatus(paidAmount, totalAmount, invoice.dueAt)
      }
    });
  }

  async findAllInvoices(query: PaginationQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { order: { number: { contains: query.search, mode: 'insensitive' } } },
              { order: { customer: { name: { contains: query.search, mode: 'insensitive' } } } }
            ]
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined
            }
          }
        : {})
    };

    const orderBy = { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' } as Prisma.InvoiceOrderByWithRelationInput;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          order: { include: { customer: true } },
          payments: true,
          receivable: true
        }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  findInvoice(id: string) {
    return this.ensureInvoice(id);
  }

  async createInvoice(dto: CreateInvoiceDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const existingOrder = await tx.order.findUnique({
          where: { id: dto.orderId },
          include: { customer: true }
        });

        if (!existingOrder) {
          throw new NotFoundException('Order not found');
        }

        const paidAmount = dto.paidAmount ?? 0;
        assertNoOverpayment(dto.totalAmount, 0, paidAmount);

        const invoice = await tx.invoice.create({
          data: {
            orderId: dto.orderId,
            number: dto.number,
            status: (dto.status as InvoiceStatus) ?? resolveInvoiceStatus(paidAmount, dto.totalAmount, dto.dueAt ? new Date(dto.dueAt) : null),
            totalAmount: dto.totalAmount,
            paidAmount,
            dueAt: dto.dueAt ? new Date(dto.dueAt) : null
          }
        });

        const receivable = await tx.receivable.upsert({
          where: { orderId: dto.orderId },
          update: {
            invoiceId: invoice.id,
            amount: dto.totalAmount,
            paidAmount,
            dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
            status: resolveDebtStatus(paidAmount, dto.totalAmount, dto.dueAt ? new Date(dto.dueAt) : null)
          },
          create: {
            customerId: existingOrder.customerId,
            orderId: dto.orderId,
            invoiceId: invoice.id,
            amount: dto.totalAmount,
            paidAmount,
            dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
            status: resolveDebtStatus(paidAmount, dto.totalAmount, dto.dueAt ? new Date(dto.dueAt) : null)
          }
        });

        await tx.order.update({
          where: { id: dto.orderId },
          data: {
            customerDebtAmount: Math.max(dto.totalAmount - paidAmount, 0),
            paidAmount
          }
        });

        await this.auditService.logTx(tx, {
          action: 'invoice.created',
          entityType: 'invoice',
          entityId: invoice.id,
          afterData: invoice,
          metadata: {
            orderId: dto.orderId,
            receivableId: receivable.id
          }
        });

        return invoice;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  updateInvoice(id: string, dto: UpdateInvoiceDto) {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: dto.status as InvoiceStatus | undefined,
        totalAmount: dto.totalAmount,
        paidAmount: dto.paidAmount,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined
      }
    });
  }

  updatePayment(id: string, dto: CreatePaymentDto) {
    return this.prisma.payment.update({
      where: { id },
      data: {
        orderId: dto.orderId,
        invoiceId: dto.invoiceId,
        cashboxId: dto.cashboxId,
        amount: dto.amount,
        method: dto.method as PaymentMethod,
        status: dto.status as PaymentStatus | undefined,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        reference: dto.reference,
        note: dto.note,
        createdById: dto.createdById
      }
    });
  }

  removeInvoice(id: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.cancelled,
        deletedAt: new Date()
      }
    });
  }

  async findAllPayments(query: PaginationQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { reference: { contains: query.search, mode: 'insensitive' } },
              { note: { contains: query.search, mode: 'insensitive' } },
              { order: { number: { contains: query.search, mode: 'insensitive' } } },
              { invoice: { number: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined
            }
          }
        : {})
    };

    const orderBy = { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' } as Prisma.PaymentOrderByWithRelationInput;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          order: true,
          invoice: true,
          cashbox: true,
          allocations: true,
          createdBy: true,
          reversedBy: true
        }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  findPayment(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
        invoice: true,
        cashbox: true,
        allocations: true,
        createdBy: true,
        reversedBy: true
      }
    });
  }

  async createPayment(dto: CreatePaymentDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const invoice = dto.invoiceId ? await this.ensureInvoice(dto.invoiceId, tx) : null;
        const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

        if (invoice) {
          assertNoOverpayment(toNumber(invoice.totalAmount), toNumber(invoice.paidAmount), dto.amount);
        }

        const payment = await tx.payment.create({
          data: {
            orderId: dto.orderId,
            invoiceId: dto.invoiceId,
            cashboxId: dto.cashboxId,
            amount: dto.amount,
            method: (dto.method as PaymentMethod) ?? PaymentMethod.other,
            status: (dto.status as PaymentStatus) ?? PaymentStatus.completed,
            paidAt,
            reference: dto.reference,
            note: dto.note,
            createdById: dto.createdById
          }
        });

        if (dto.invoiceId) {
          const nextPaid = toNumber(invoice!.paidAmount) + dto.amount;
          const invoiceStatus = resolveInvoiceStatus(nextPaid, toNumber(invoice!.totalAmount), invoice!.dueAt);

          await tx.invoice.update({
            where: { id: dto.invoiceId },
            data: {
              paidAmount: nextPaid,
              status: invoiceStatus,
              paidAt: invoiceStatus === InvoiceStatus.paid ? paidAt : invoice!.paidAt,
              closedAt: invoiceStatus === InvoiceStatus.paid ? new Date() : null
            }
          });

          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              invoiceId: dto.invoiceId,
              amount: dto.amount,
              note: dto.reference
            }
          });

          await this.syncOrderAndDebt(tx, {
            id: invoice!.id,
            orderId: invoice!.orderId,
            totalAmount: toNumber(invoice!.totalAmount),
            paidAmount: nextPaid,
            dueAt: invoice!.dueAt
          });
        } else if (dto.orderId) {
          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              amount: dto.amount,
              note: dto.reference
            }
          });

          const order = await tx.order.findUnique({ where: { id: dto.orderId } });
          if (order) {
            await tx.order.update({
              where: { id: order.id },
              data: {
                paidAmount: toNumber(order.paidAmount) + dto.amount,
                customerDebtAmount: Math.max(toNumber(order.totalAmount) - (toNumber(order.paidAmount) + dto.amount), 0)
              }
            });
          }
        }

        if (dto.method === PaymentMethod.cash && dto.cashboxId) {
          const cashbox = await tx.cashbox.findUnique({
            where: { id: dto.cashboxId }
          });

          if (cashbox) {
            await tx.cashbox.update({
              where: { id: cashbox.id },
              data: {
                currentBalance: toNumber(cashbox.currentBalance) + dto.amount
              }
            });

            await tx.cashboxTransaction.create({
              data: {
                cashboxId: cashbox.id,
                paymentId: payment.id,
                createdById: dto.createdById,
                type: CashboxTransactionType.income,
                method: PaymentMethod.cash,
                amount: dto.amount,
                reference: dto.reference,
                note: dto.note
              }
            });
          }
        }

        await this.auditService.logTx(tx, {
          action: 'payment.created',
          entityType: 'payment',
          entityId: payment.id,
          afterData: payment,
          metadata: {
            invoiceId: dto.invoiceId ?? null,
            orderId: dto.orderId ?? null
          }
        });

        return payment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async summary() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalInvoices,
      unpaidInvoices,
      overdueInvoices,
      receivables,
      payables,
      cashboxes,
      todayIncomePayments,
      todayExpenseTx,
      monthIncomePayments,
      monthExpenseTx
    ] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where: { deletedAt: null } }),
      this.prisma.invoice.count({
        where: {
          deletedAt: null,
          status: { in: [InvoiceStatus.draft, InvoiceStatus.issued, InvoiceStatus.partially_paid, InvoiceStatus.overdue] }
        }
      }),
      this.prisma.invoice.count({
        where: {
          deletedAt: null,
          status: InvoiceStatus.overdue
        }
      }),
      this.prisma.receivable.aggregate({
        where: { deletedAt: null },
        _sum: {
          amount: true,
          paidAmount: true
        }
      }),
      this.prisma.payable.aggregate({
        where: { deletedAt: null },
        _sum: {
          amount: true,
          paidAmount: true
        }
      }),
      this.prisma.cashbox.aggregate({
        where: { deletedAt: null },
        _sum: {
          currentBalance: true
        }
      }),
      this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfDay },
          status: PaymentStatus.completed
        },
        _sum: {
          amount: true
        }
      }),
      this.prisma.cashboxTransaction.aggregate({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfDay },
          type: CashboxTransactionType.expense
        },
        _sum: {
          amount: true
        }
      }),
      this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfMonth },
          status: PaymentStatus.completed
        },
        _sum: {
          amount: true
        }
      }),
      this.prisma.cashboxTransaction.aggregate({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfMonth },
          type: CashboxTransactionType.expense
        },
        _sum: {
          amount: true
        }
      })
    ]);

    return calculateFinanceSummary({
      totalInvoices,
      unpaidInvoices,
      overdueInvoices,
      totalReceivables: Math.max(toNumber(receivables._sum.amount) - toNumber(receivables._sum.paidAmount), 0),
      totalPayables: Math.max(toNumber(payables._sum.amount) - toNumber(payables._sum.paidAmount), 0),
      totalCashboxBalance: toNumber(cashboxes._sum.currentBalance),
      todayIncome: toNumber(todayIncomePayments._sum.amount),
      todayExpense: toNumber(todayExpenseTx._sum.amount),
      monthIncome: toNumber(monthIncomePayments._sum.amount),
      monthExpense: toNumber(monthExpenseTx._sum.amount)
    });
  }

  async reversePayment(id: string, reversedById?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findFirst({
          where: { id, deletedAt: null },
          include: { invoice: true, order: true, cashbox: true, allocations: true }
        });

        if (!payment) {
          throw new NotFoundException('Payment not found');
        }

        if (payment.status === PaymentStatus.reversed) {
          throw new PaymentAlreadyReversedException();
        }

        const beforePayment = payment;
        const paidAmount = toNumber(payment.amount);

        if (payment.invoiceId && payment.invoice) {
          const nextPaid = Math.max(toNumber(payment.invoice.paidAmount) - paidAmount, 0);
          const invoiceStatus = resolveInvoiceStatus(nextPaid, toNumber(payment.invoice.totalAmount), payment.invoice.dueAt);

          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: {
              paidAmount: nextPaid,
              status: invoiceStatus,
              closedAt: invoiceStatus === InvoiceStatus.paid ? new Date() : null
            }
          });

          await this.syncOrderAndDebt(tx, {
            id: payment.invoice.id,
            orderId: payment.invoice.orderId,
            totalAmount: toNumber(payment.invoice.totalAmount),
            paidAmount: nextPaid,
            dueAt: payment.invoice.dueAt
          });
        }

        if (payment.orderId && !payment.invoiceId && payment.order) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              paidAmount: Math.max(toNumber(payment.order.paidAmount) - paidAmount, 0),
              customerDebtAmount: Math.max(
                toNumber(payment.order.totalAmount) - Math.max(toNumber(payment.order.paidAmount) - paidAmount, 0),
                0
              )
            }
          });
        }

        if (payment.method === PaymentMethod.cash && payment.cashboxId && payment.cashbox) {
          await tx.cashbox.update({
            where: { id: payment.cashboxId },
            data: {
              currentBalance: toNumber(payment.cashbox.currentBalance) - paidAmount
            }
          });

          await tx.cashboxTransaction.create({
            data: {
              cashboxId: payment.cashboxId,
              paymentId: payment.id,
              createdById: reversedById,
              type: CashboxTransactionType.expense,
              method: PaymentMethod.cash,
              amount: paidAmount,
              reference: `reverse:${payment.id}`,
              note: payment.note
            }
          });
        }

        const updated = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.reversed,
            reversedAt: new Date(),
            reversedById
          }
        });

        await this.auditService.logTx(tx, {
          action: 'payment.reversed',
          entityType: 'payment',
          entityId: payment.id,
          beforeData: beforePayment,
          afterData: updated,
          metadata: {
            reversedById: reversedById ?? null
          }
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  removePayment(id: string) {
    return this.reversePayment(id);
  }

  async findReceivables(query: PaginationQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.ReceivableWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
              { invoice: { number: { contains: query.search, mode: 'insensitive' } } },
              { order: { number: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.receivable.count({ where }),
      this.prisma.receivable.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, invoice: true, order: true }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findPayables(query: PaginationQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.PayableWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { counterpartyName: { contains: query.search, mode: 'insensitive' } },
              { purchaseReference: { contains: query.search, mode: 'insensitive' } },
              { note: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.payable.count({ where }),
      this.prisma.payable.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { allocations: true }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  findCashboxes() {
    return this.prisma.cashbox.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  createCashbox(dto: CreateCashboxDto) {
    return this.prisma.cashbox.create({
      data: {
        code: dto.code,
        name: dto.name,
        currencyCode: dto.currencyCode ?? 'USD',
        openingBalance: dto.openingBalance ?? 0,
        currentBalance: dto.openingBalance ?? 0
      }
    });
  }

  updateCashbox(id: string, dto: UpdateCashboxDto) {
    return this.prisma.cashbox.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        currencyCode: dto.currencyCode,
        openingBalance: dto.openingBalance,
        currentBalance: dto.openingBalance
      }
    });
  }
}
