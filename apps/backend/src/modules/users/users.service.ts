import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });
  }

  findOne(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });
  }

  async findManagers() {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        roles: {
          some: {
            role: {
              key: { in: ['super_admin', 'owner', 'manager'] }
            }
          }
        }
      },
      orderBy: { fullName: 'asc' },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      isActive: user.isActive,
      roles: user.roles.map((entry) => entry.role.key)
    }));
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        isActive: dto.isActive ?? true,
        roles: dto.roles?.length
          ? {
              create: dto.roles.map((roleKey) => ({
                role: {
                  connect: { key: roleKey }
                }
              }))
            }
          : undefined
      }
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: Record<string, unknown> = {
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone,
      isActive: dto.isActive
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  remove(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
