import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentMethod, PaymentStatus, DebtStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateCashboxDto,
  CreateInvoiceDto,
  CreatePaymentDto,
  UpdateCashboxDto,
  UpdateInvoiceDto
} from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureInvoice(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { order: true, payments: true, receivable: true }
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  findAllInvoices() {
    return this.prisma.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        order: { include: { customer: true } },
        payments: true,
        receivable: true
      }
    });
  }

  findInvoice(id: string) {
    return this.ensureInvoice(id);
  }

  async createInvoice(dto: CreateInvoiceDto) {
    const invoice = await this.prisma.invoice.create({
      data: {
        orderId: dto.orderId,
        number: dto.number,
        status: (dto.status as InvoiceStatus) ?? InvoiceStatus.draft,
        totalAmount: dto.totalAmount,
        paidAmount: dto.paidAmount ?? 0,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null
      }
    });

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { customer: true }
    });

    if (order) {
      await this.prisma.receivable.upsert({
        where: { orderId: dto.orderId },
        update: {
          invoiceId: invoice.id,
          amount: dto.totalAmount,
          paidAmount: dto.paidAmount ?? 0,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
          status: (dto.paidAmount ?? 0) >= dto.totalAmount ? DebtStatus.closed : DebtStatus.open
        },
        create: {
          customerId: order.customerId,
          orderId: dto.orderId,
          invoiceId: invoice.id,
          amount: dto.totalAmount,
          paidAmount: dto.paidAmount ?? 0,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
          status: (dto.paidAmount ?? 0) >= dto.totalAmount ? DebtStatus.closed : DebtStatus.open
        }
      });

      await this.prisma.order.update({
        where: { id: dto.orderId },
        data: {
          customerDebtAmount: Math.max(dto.totalAmount - (dto.paidAmount ?? 0), 0),
          paidAmount: dto.paidAmount ?? 0
        }
      });
    }

    return invoice;
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

  removeInvoice(id: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.cancelled,
        deletedAt: new Date()
      }
    });
  }

  findAllPayments() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        order: true,
        invoice: true,
        cashbox: true,
        allocations: true,
        createdBy: true
      }
    });
  }

  findPayment(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
        invoice: true,
        cashbox: true,
        allocations: true,
        createdBy: true
      }
    });
  }

  async createPayment(dto: CreatePaymentDto) {
    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        invoiceId: dto.invoiceId,
        cashboxId: dto.cashboxId,
        amount: dto.amount,
        method: (dto.method as PaymentMethod) ?? PaymentMethod.other,
        status: (dto.status as PaymentStatus) ?? PaymentStatus.completed,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        reference: dto.reference,
        note: dto.note,
        createdById: dto.createdById
      }
    });

    if (dto.invoiceId) {
      const invoice = await this.ensureInvoice(dto.invoiceId);
      const nextPaid = Number(invoice.paidAmount) + Number(dto.amount);
      const status = nextPaid >= Number(invoice.totalAmount)
        ? InvoiceStatus.paid
        : nextPaid > 0
          ? InvoiceStatus.partially_paid
          : InvoiceStatus.issued;

      await this.prisma.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          paidAmount: nextPaid,
          status,
          paidAt: status === InvoiceStatus.paid ? payment.paidAt : undefined,
          closedAt: status === InvoiceStatus.paid ? new Date() : undefined
        }
      });

      await this.prisma.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: dto.invoiceId,
          amount: dto.amount,
          note: dto.reference
        }
      });

      await this.prisma.receivable.updateMany({
        where: { invoiceId: dto.invoiceId },
        data: {
          paidAmount: nextPaid,
          status: status === InvoiceStatus.paid ? DebtStatus.closed : DebtStatus.partial
        }
      });

      const order = await this.prisma.order.findUnique({ where: { id: invoice.orderId } });
      if (order) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            paidAmount: nextPaid,
            customerDebtAmount: Math.max(Number(invoice.totalAmount) - nextPaid, 0)
          }
        });
      }
    }

    if (dto.orderId && !dto.invoiceId) {
      await this.prisma.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          amount: dto.amount,
          note: dto.reference
        }
      });
    }

    return payment;
  }

  updatePayment(id: string, dto: CreatePaymentDto) {
    return this.prisma.payment.update({
      where: { id },
      data: {
        orderId: dto.orderId,
        invoiceId: dto.invoiceId,
        cashboxId: dto.cashboxId,
        amount: dto.amount,
        method: dto.method as PaymentMethod | undefined,
        status: dto.status as PaymentStatus | undefined,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        reference: dto.reference,
        note: dto.note,
        createdById: dto.createdById
      }
    });
  }

  removePayment(id: string) {
    return this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.reversed,
        deletedAt: new Date()
      }
    });
  }

  findReceivables() {
    return this.prisma.receivable.findMany({
      orderBy: { createdAt: 'desc' },
      include: { customer: true, invoice: true, order: true }
    });
  }

  findPayables() {
    return this.prisma.payable.findMany({
      orderBy: { createdAt: 'desc' },
      include: { allocations: true }
    });
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
