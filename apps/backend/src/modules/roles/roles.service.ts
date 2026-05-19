import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });
  }

  findOne(id: string) {
    return this.prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });
  }

  create(dto: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description
      }
    });
  }

  update(id: string, dto: UpdateRoleDto) {
    return this.prisma.role.update({
      where: { id },
      data: dto
    });
  }

  remove(id: string) {
    return this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
