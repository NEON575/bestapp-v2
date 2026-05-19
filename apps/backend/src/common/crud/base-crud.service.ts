import { NotFoundException } from '@nestjs/common';

type ModelDelegate = {
  findMany: (args?: Record<string, unknown>) => Promise<unknown[]>;
  findFirst: (args?: Record<string, unknown>) => Promise<unknown | null>;
  create: (args: { data: unknown }) => Promise<unknown>;
  update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
};

export abstract class BaseCrudService {
  protected abstract get model(): ModelDelegate;

  async findAll() {
    return this.model.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const entity = await this.model.findFirst({
      where: { id, deletedAt: null }
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return entity;
  }

  async create(data: Record<string, unknown>) {
    return this.model.create({ data });
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.findOne(id);
    return this.model.update({
      where: { id },
      data
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.model.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}

