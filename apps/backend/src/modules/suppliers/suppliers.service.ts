import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import { CreateSupplierDto, SupplierListQueryDto, UpdateSupplierDto } from './dto/supplier.dto';

function cleanText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

@Injectable()
export class SuppliersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async nextSupplierCode(tx: Prisma.TransactionClient) {
    for (let attempts = 0; attempts < 50; attempts += 1) {
      const sequence = await tx.numberSequence.upsert({
        where: { key: 'supplier' },
        update: {},
        create: {
          key: 'supplier',
          prefix: 'SUP-',
          currentValue: 0,
          step: 1,
          padding: 6
        }
      });

      const nextValue = sequence.currentValue + sequence.step;
      await tx.numberSequence.update({
        where: { key: 'supplier' },
        data: { currentValue: nextValue }
      });

      const code = `${sequence.prefix}${String(nextValue).padStart(sequence.padding, '0')}`;
      const existing = await tx.supplier.findFirst({ where: { code } });
      if (!existing) {
        return code;
      }
    }

    throw new BadRequestException('Təchizatçı kodu yaradılmadı');
  }

  private async resolveCode(tx: Prisma.TransactionClient, dto: CreateSupplierDto | UpdateSupplierDto, currentCode?: string | null) {
    const requested = dto.code?.trim();

    if (requested) {
      const existing = await tx.supplier.findFirst({ where: { code: requested } });
      if (existing && existing.code !== currentCode) {
        throw new BadRequestException('Bu təchizatçı kodu artıq mövcuddur');
      }
      return requested;
    }

    if (currentCode) {
      return currentCode;
    }

    return this.nextSupplierCode(tx);
  }

  private toCreateData(dto: CreateSupplierDto, code: string) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Təchizatçı adı boş ola bilməz');
    }

    return {
      code,
      name,
      phone: cleanText(dto.phone),
      taxId: cleanText(dto.taxId),
      email: cleanText(dto.email),
      address: cleanText(dto.address),
      notes: cleanText(dto.notes),
      isActive: dto.isActive ?? true
    };
  }

  async create(dto: CreateSupplierDto) {
    return this.prisma.$transaction(async (tx) => {
      const code = await this.resolveCode(tx, dto);
      return tx.supplier.create({
        data: this.toCreateData(dto, code)
      });
    });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException('Təchizatçı tapılmadı');
    }

    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Təchizatçı adı boş ola bilməz');
    }

    return this.prisma.$transaction(async (tx) => {
      const code = await this.resolveCode(tx, dto, existing.code);
      return tx.supplier.update({
        where: { id },
        data: {
          code,
          ...(name ? { name } : {}),
          ...(dto.phone !== undefined ? { phone: cleanText(dto.phone) } : {}),
          ...(dto.taxId !== undefined ? { taxId: cleanText(dto.taxId) } : {}),
          ...(dto.email !== undefined ? { email: cleanText(dto.email) } : {}),
          ...(dto.address !== undefined ? { address: cleanText(dto.address) } : {}),
          ...(dto.notes !== undefined ? { notes: cleanText(dto.notes) } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
        }
      });
    });
  }

  async findAll(query: SupplierListQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.SupplierWhereInput = {
      deletedAt: null,
      ...(query.status === 'active'
        ? { isActive: true }
        : query.status === 'inactive'
          ? { isActive: false }
          : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { taxId: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!supplier) {
      throw new NotFoundException('Təchizatçı tapılmadı');
    }

    return supplier;
  }

  async remove(id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!supplier) {
      throw new NotFoundException('Təchizatçı tapılmadı');
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });
  }
}
