import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import { CreatePaperDto, PaperQueryDto, UpdatePaperDto } from './dto/papers.dto';

function roundMoney(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

@Injectable()
export class PapersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private pricePerSheet(packPrice: number, sheetsInPack: number) {
    if (sheetsInPack <= 0) return 0;
    return roundMoney(packPrice / sheetsInPack, 4);
  }

  async findAll(query: PaperQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.PaperWhereInput = {
      deletedAt: null,
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { size: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };

    const orderBy = { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' } as Prisma.PaperOrderByWithRelationInput;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.paper.count({ where }),
      this.prisma.paper.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { supplier: true }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const paper = await this.prisma.paper.findFirst({
      where: { id, deletedAt: null },
      include: { supplier: true }
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    return paper;
  }

  create(dto: CreatePaperDto) {
    return this.prisma.paper.create({
      data: {
        supplierId: dto.supplierId,
        code: dto.code,
        name: dto.name,
        gram: dto.gram,
        size: dto.size,
        packPrice: dto.packPrice,
        sheetsInPack: Math.round(dto.sheetsInPack),
        pricePerSheet: this.pricePerSheet(dto.packPrice, dto.sheetsInPack),
        vatIncluded: dto.vatIncluded ?? false,
        unit: dto.unit ?? 'sheet',
        notes: dto.notes
      }
    });
  }

  async update(id: string, dto: UpdatePaperDto) {
    const existing = await this.prisma.paper.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException('Paper not found');
    }

    const packPrice = dto.packPrice ?? Number(existing.packPrice);
    const sheetsInPack = dto.sheetsInPack ?? existing.sheetsInPack;

    return this.prisma.paper.update({
      where: { id },
      data: {
        supplierId: dto.supplierId ?? existing.supplierId,
        code: dto.code ?? existing.code,
        name: dto.name ?? existing.name,
        gram: dto.gram ?? Number(existing.gram),
        size: dto.size ?? existing.size,
        packPrice,
        sheetsInPack: Math.round(sheetsInPack),
        pricePerSheet: this.pricePerSheet(packPrice, sheetsInPack),
        vatIncluded: dto.vatIncluded ?? existing.vatIncluded,
        unit: dto.unit ?? existing.unit,
        notes: dto.notes ?? existing.notes
      }
    });
  }

  remove(id: string) {
    return this.prisma.paper.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}

