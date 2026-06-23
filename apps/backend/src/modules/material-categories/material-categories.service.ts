import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type MaterialCategory, type MaterialCategoryParameter, type MaterialCategoryParameterValue } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateMaterialCategoryParameterDto,
  CreateMaterialCategoryParameterValueDto,
  UpdateMaterialCategoryParameterDto,
  UpdateMaterialCategoryParameterValueDto
} from './dto/material-category-parameter.dto';

function toNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function mapCategory(category: MaterialCategory) {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    codePrefix: category.codePrefix,
    description: category.description,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString()
  };
}

function mapValue(value: MaterialCategoryParameterValue) {
  return {
    id: value.id,
    parameterId: value.parameterId,
    value: value.value,
    sortOrder: toNumber(value.sortOrder),
    isActive: value.isActive,
    notes: value.notes,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString()
  };
}

function mapParameter(parameter: MaterialCategoryParameter & { values?: MaterialCategoryParameterValue[] }) {
  return {
    id: parameter.id,
    categoryId: parameter.categoryId,
    name: parameter.name,
    sortOrder: toNumber(parameter.sortOrder),
    isActive: parameter.isActive,
    notes: parameter.notes,
    createdAt: parameter.createdAt.toISOString(),
    updatedAt: parameter.updatedAt.toISOString(),
    values: (parameter.values ?? []).map(mapValue)
  };
}

@Injectable()
export class MaterialCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    const categories = await this.prisma.materialCategory.findMany({
      where: { deletedAt: null },
      orderBy: [{ name: 'asc' }]
    });

    return categories.map(mapCategory);
  }

  async listParameters(categoryId: string) {
    const category = await this.prisma.materialCategory.findFirst({
      where: { id: categoryId, deletedAt: null }
    });

    if (!category) {
      throw new NotFoundException('Kateqoriya tapılmadı');
    }

    const parameters = await this.prisma.materialCategoryParameter.findMany({
      where: { categoryId, deletedAt: null },
      include: { values: { where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });

    return parameters.map(mapParameter);
  }

  async createParameter(categoryId: string, dto: CreateMaterialCategoryParameterDto) {
    const category = await this.prisma.materialCategory.findFirst({
      where: { id: categoryId, deletedAt: null }
    });

    if (!category) {
      throw new NotFoundException('Kateqoriya tapılmadı');
    }

    const parameter = await this.prisma.materialCategoryParameter.create({
      data: {
        category: { connect: { id: categoryId } },
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        notes: dto.notes?.trim() || null
      },
      include: { values: true }
    });

    return mapParameter(parameter);
  }

  async updateParameter(id: string, dto: UpdateMaterialCategoryParameterDto) {
    const existing = await this.prisma.materialCategoryParameter.findFirst({
      where: { id, deletedAt: null },
      include: { values: true }
    });

    if (!existing) {
      throw new NotFoundException('Parametr tapılmadı');
    }

    const updated = await this.prisma.materialCategoryParameter.update({
      where: { id },
      data: {
        name: dto.name?.trim() ?? existing.name,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        isActive: dto.isActive ?? existing.isActive,
        notes: dto.notes === undefined ? existing.notes : dto.notes?.trim() || null
      },
      include: { values: { where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] } }
    });

    return mapParameter(updated);
  }

  async removeParameter(id: string) {
    const existing = await this.prisma.materialCategoryParameter.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException('Parametr tapılmadı');
    }

    const removed = await this.prisma.materialCategoryParameter.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      },
      include: { values: true }
    });

    return mapParameter(removed);
  }

  async listValues(parameterId: string) {
    const parameter = await this.prisma.materialCategoryParameter.findFirst({
      where: { id: parameterId, deletedAt: null }
    });

    if (!parameter) {
      throw new NotFoundException('Parametr tapılmadı');
    }

    const values = await this.prisma.materialCategoryParameterValue.findMany({
      where: { parameterId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }]
    });

    return values.map(mapValue);
  }

  async createValue(parameterId: string, dto: CreateMaterialCategoryParameterValueDto) {
    const parameter = await this.prisma.materialCategoryParameter.findFirst({
      where: { id: parameterId, deletedAt: null }
    });

    if (!parameter) {
      throw new NotFoundException('Parametr tapılmadı');
    }

    const value = await this.prisma.materialCategoryParameterValue.create({
      data: {
        parameter: { connect: { id: parameterId } },
        value: dto.value.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        notes: dto.notes?.trim() || null
      }
    });

    return mapValue(value);
  }

  async updateValue(id: string, dto: UpdateMaterialCategoryParameterValueDto) {
    const existing = await this.prisma.materialCategoryParameterValue.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException('Dəyər tapılmadı');
    }

    const updated = await this.prisma.materialCategoryParameterValue.update({
      where: { id },
      data: {
        value: dto.value?.trim() ?? existing.value,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        isActive: dto.isActive ?? existing.isActive,
        notes: dto.notes === undefined ? existing.notes : dto.notes?.trim() || null
      }
    });

    return mapValue(updated);
  }

  async removeValue(id: string) {
    const existing = await this.prisma.materialCategoryParameterValue.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException('Dəyər tapılmadı');
    }

    const removed = await this.prisma.materialCategoryParameterValue.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    return mapValue(removed);
  }
}

