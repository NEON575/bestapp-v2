import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import { CustomerListQueryDto, CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

function cleanText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

@Injectable()
export class CustomersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private toCreateData(dto: CreateCustomerDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Müştəri adı boş ola bilməz');
    }

    return {
      name,
      companyName: cleanText(dto.companyName),
      phone: cleanText(dto.phone),
      email: cleanText(dto.email),
      taxId: cleanText(dto.taxId),
      address: cleanText(dto.address),
      notes: cleanText(dto.notes),
      inquiryNote: cleanText(dto.inquiryNote),
      isActive: dto.isActive ?? true
    };
  }

  async create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: this.toCreateData(dto)
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException('Müştəri tapılmadı');
    }

    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Müştəri adı boş ola bilməz');
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(dto.companyName !== undefined ? { companyName: cleanText(dto.companyName) } : {}),
        ...(dto.phone !== undefined ? { phone: cleanText(dto.phone) } : {}),
        ...(dto.email !== undefined ? { email: cleanText(dto.email) } : {}),
        ...(dto.taxId !== undefined ? { taxId: cleanText(dto.taxId) } : {}),
        ...(dto.address !== undefined ? { address: cleanText(dto.address) } : {}),
        ...(dto.notes !== undefined ? { notes: cleanText(dto.notes) } : {}),
        ...(dto.inquiryNote !== undefined ? { inquiryNote: cleanText(dto.inquiryNote) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
      }
    });
  }

  async findAll(query: CustomerListQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(query.status === 'active'
        ? { isActive: true }
        : query.status === 'inactive'
          ? { isActive: false }
          : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { companyName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { taxId: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null }
    });

    if (!customer) {
      throw new NotFoundException('Müştəri tapılmadı');
    }

    return customer;
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) {
      throw new NotFoundException('Müştəri tapılmadı');
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });
  }
}
