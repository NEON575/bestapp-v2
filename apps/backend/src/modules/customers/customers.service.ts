import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto as any });
  }

  update(id: string, dto: UpdateCustomerDto) {
    return this.prisma.customer.update({ where: { id }, data: dto as any });
  }

  findAll() {
    return this.prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  findOne(id: string) {
    return this.prisma.customer.findFirst({
      where: { id, deletedAt: null }
    });
  }

  remove(id: string) {
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
