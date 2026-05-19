import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInvoiceDto, CreatePaymentDto, UpdateInvoiceDto } from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {
  }

  findAllInvoices() {
    return this.prisma.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { order: true, payments: true }
    });
  }

  createInvoice(dto: CreateInvoiceDto) {
    return this.prisma.invoice.create({
      data: {
        orderId: dto.orderId,
        number: dto.number,
        status: dto.status ?? 'draft',
        totalAmount: dto.totalAmount,
        paidAmount: dto.paidAmount,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null
      }
    });
  }

  updateInvoice(id: string, dto: UpdateInvoiceDto) {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...dto,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined
      }
    });
  }

  createPayment(dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        method: dto.method,
        status: dto.status ?? 'pending',
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
        reference: dto.reference
      }
    });
  }

  remove(id: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
