import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import {
  CreateEmployeeDto,
  CreateSalaryEntryDto,
  SalaryEntryQueryDto,
  UpdateEmployeeDto,
  UpdateSalaryEntryDto
} from './dto/salaries.dto';
import { aggregateSalaryByEmployee, recalculateSalaryEntry } from '../../common/business/salary-entry';
import {
  buildEmployeePlaceholderEmail,
  employeeShouldSyncToUser,
  mapEmployeeRoleToUserRoles
} from '../../common/business/employee-user';

@Injectable()
export class SalariesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  private async syncEmployeeUser(tx: Prisma.TransactionClient, employee: {
    id: string;
    userId: string | null;
    fullName: string;
    phone: string | null;
    roleKey: string | null;
    isActive: boolean;
    deletedAt: Date | null;
  }) {
    const roleKeys = mapEmployeeRoleToUserRoles(employee.roleKey);
    const shouldSync = employeeShouldSyncToUser(employee.roleKey);
    const baseUserData = {
      fullName: employee.fullName,
      phone: employee.phone,
      isActive: employee.isActive && shouldSync && !employee.deletedAt,
      deletedAt: employee.deletedAt ?? (employee.isActive && shouldSync ? null : new Date())
    };

    if (!shouldSync) {
      if (employee.userId) {
        await tx.user.update({
          where: { id: employee.userId },
          data: {
            ...baseUserData,
            isActive: false,
            deletedAt: employee.deletedAt ?? new Date()
          }
        });
        await tx.userRole.deleteMany({ where: { userId: employee.userId } });
      }
      return null;
    }

    const passwordHash = await bcrypt.hash(`Emp-${employee.id.slice(0, 8)}!`, 10);
    const user =
      employee.userId != null
        ? await tx.user.update({
            where: { id: employee.userId },
            data: baseUserData
          })
        : await tx.user.create({
            data: {
              email: buildEmployeePlaceholderEmail(employee.fullName, employee.id),
              passwordHash,
              ...baseUserData
            }
          });

    if (!employee.userId) {
      await tx.employee.update({
        where: { id: employee.id },
        data: { userId: user.id }
      });
    }

    await tx.userRole.deleteMany({ where: { userId: user.id } });
    if (roleKeys.length) {
      for (const roleKey of roleKeys) {
        const role = await tx.role.findUnique({ where: { key: roleKey } });
        if (!role) continue;
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId: user.id,
              roleId: role.id
            }
          },
          update: {},
          create: {
            userId: user.id,
            roleId: role.id
          }
        });
      }
    }

    return user;
  }

  async listEmployees() {
    const unsynced = await this.prisma.employee.findMany({
      where: {
        deletedAt: null,
        userId: null,
        isActive: true,
        roleKey: { in: ['owner', 'manager', 'production', 'accountant', 'warehouse'] }
      }
    });

    for (const employee of unsynced) {
      await this.prisma.$transaction(async (tx) => {
        await this.syncEmployeeUser(tx, {
          id: employee.id,
          userId: employee.userId,
          fullName: employee.fullName,
          phone: employee.phone,
          roleKey: employee.roleKey,
          isActive: employee.isActive,
          deletedAt: employee.deletedAt
        });
      });
    }

    return this.prisma.employee.findMany({
      where: { deletedAt: null },
      orderBy: { fullName: 'asc' }
    });
  }

  createEmployee(dto: CreateEmployeeDto) {
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          fullName: dto.fullName,
          phone: dto.phone,
          title: dto.title,
          roleKey: dto.roleKey,
          notes: dto.notes,
          isActive: dto.isActive ?? true
        }
      });

      await this.syncEmployeeUser(tx, {
        id: employee.id,
        userId: employee.userId,
        fullName: employee.fullName,
        phone: employee.phone,
        roleKey: employee.roleKey,
        isActive: employee.isActive,
        deletedAt: employee.deletedAt
      });

      return tx.employee.findUniqueOrThrow({ where: { id: employee.id } });
    });
  }

  updateEmployee(id: string, dto: UpdateEmployeeDto) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id },
        data: {
          fullName: dto.fullName,
          phone: dto.phone,
          title: dto.title,
          roleKey: dto.roleKey,
          notes: dto.notes,
          isActive: dto.isActive
        }
      });

      await this.syncEmployeeUser(tx, {
        id: updated.id,
        userId: updated.userId,
        fullName: updated.fullName,
        phone: updated.phone,
        roleKey: updated.roleKey,
        isActive: updated.isActive,
        deletedAt: updated.deletedAt
      });

      return updated;
    });
  }

  removeEmployee(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({
        where: { id, deletedAt: null }
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      const deletedAt = new Date();
      const updated = await tx.employee.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt
        }
      });

      await this.syncEmployeeUser(tx, {
        id: updated.id,
        userId: updated.userId,
        fullName: updated.fullName,
        phone: updated.phone,
        roleKey: updated.roleKey,
        isActive: updated.isActive,
        deletedAt: updated.deletedAt
      });

      return updated;
    });
  }

  async findAll(query: SalaryEntryQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.SalaryEntryWhereInput = {
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.search
        ? {
            OR: [
              { employee: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { comment: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined
            }
          }
        : {})
    };

    const orderBy = { [query.sortBy ?? 'date']: query.sortOrder ?? 'desc' } as Prisma.SalaryEntryOrderByWithRelationInput;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.salaryEntry.count({ where }),
      this.prisma.salaryEntry.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { employee: true }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async quickCreate(dto: CreateSalaryEntryDto) {
    return this.create(dto);
  }

  async create(dto: CreateSalaryEntryDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const calculated = recalculateSalaryEntry(dto.salaryAmount, dto.bonusAmount ?? 0, dto.paymentAmount ?? 0);
        const created = await tx.salaryEntry.create({
          data: {
            employeeId: dto.employeeId,
            date: dto.date ? new Date(dto.date) : new Date(),
            salaryAmount: calculated.salaryAmount,
            bonusAmount: calculated.bonusAmount,
            paymentAmount: calculated.paymentAmount,
            remainingDebt: calculated.remainingDebt,
            comment: dto.comment
          }
        });

        await this.auditService.logTx(tx, {
          action: 'salary_entry.created',
          entityType: 'salary_entry',
          entityId: created.id,
          afterData: created
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async update(id: string, dto: UpdateSalaryEntryDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.salaryEntry.findFirst({
          where: { id, deletedAt: null }
        });

        if (!existing) {
          throw new NotFoundException('Salary entry not found');
        }

        const calculated = recalculateSalaryEntry(
          dto.salaryAmount ?? Number(existing.salaryAmount),
          dto.bonusAmount ?? Number(existing.bonusAmount),
          dto.paymentAmount ?? Number(existing.paymentAmount)
        );

        const updated = await tx.salaryEntry.update({
          where: { id },
          data: {
            employeeId: dto.employeeId ?? existing.employeeId,
            date: dto.date ? new Date(dto.date) : existing.date,
            salaryAmount: calculated.salaryAmount,
            bonusAmount: calculated.bonusAmount,
            paymentAmount: calculated.paymentAmount,
            remainingDebt: calculated.remainingDebt,
            comment: dto.comment ?? existing.comment
          }
        });

        await this.auditService.logTx(tx, {
          action: 'salary_entry.updated',
          entityType: 'salary_entry',
          entityId: updated.id,
          beforeData: existing,
          afterData: updated
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  remove(id: string) {
    return this.prisma.salaryEntry.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async summary(query: Partial<SalaryEntryQueryDto> = {}) {
    const entries = await this.prisma.salaryEntry.findMany({
      where: {
        deletedAt: null,
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...(query.search
          ? {
              OR: [
                { employee: { fullName: { contains: query.search, mode: 'insensitive' } } },
                { comment: { contains: query.search, mode: 'insensitive' } }
              ]
            }
          : {}),
        ...(query.dateFrom || query.dateTo
          ? {
              date: {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined
              }
            }
          : {})
      },
      include: { employee: true }
    });

    const employees = aggregateSalaryByEmployee(
      entries.map((entry) => ({
        employeeId: entry.employeeId,
        employeeName: entry.employee.fullName,
        salaryAmount: entry.salaryAmount,
        bonusAmount: entry.bonusAmount,
        paymentAmount: entry.paymentAmount,
        remainingDebt: entry.remainingDebt
      }))
    );

    return {
      totalSalaryAmount: entries.reduce((sum, entry) => sum + Number(entry.salaryAmount), 0),
      totalBonusAmount: entries.reduce((sum, entry) => sum + Number(entry.bonusAmount), 0),
      totalPaymentAmount: entries.reduce((sum, entry) => sum + Number(entry.paymentAmount), 0),
      totalRemainingDebt: entries.reduce((sum, entry) => sum + Number(entry.remainingDebt), 0),
      employees
    };
  }
}
