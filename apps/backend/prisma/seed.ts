import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const permissions = [
  { key: 'dashboard.view', name: 'View dashboard' },
  { key: 'orders.read', name: 'Read orders' },
  { key: 'orders.write', name: 'Write orders' },
  { key: 'orders.calculate', name: 'Calculate order price' },
  { key: 'orders.approve', name: 'Approve order price' },
  { key: 'customers.read', name: 'Read customers' },
  { key: 'customers.write', name: 'Write customers' },
  { key: 'inventory.read', name: 'Read inventory' },
  { key: 'inventory.write', name: 'Write inventory' },
  { key: 'inventory.reserve', name: 'Reserve inventory' },
  { key: 'inventory.write_off', name: 'Write off inventory' },
  { key: 'finance.read', name: 'Read finance' },
  { key: 'finance.write', name: 'Write finance' },
  { key: 'finance.payments', name: 'Manage payments' },
  { key: 'finance.cashbox', name: 'Manage cashbox' },
  { key: 'production.read', name: 'Read production' },
  { key: 'production.write', name: 'Write production' },
  { key: 'pricing.read', name: 'Read pricing' },
  { key: 'pricing.write', name: 'Write pricing' },
  { key: 'audit.read', name: 'Read audit logs' },
  { key: 'users.manage', name: 'Manage users' },
  { key: 'roles.manage', name: 'Manage roles' }
];

async function main() {
  const permissionRows = await Promise.all(
    permissions.map((permission) =>
      prisma.permission.upsert({
        where: { key: permission.key },
        update: { name: permission.name },
        create: permission
      })
    )
  );

  const roles = [
    { key: 'super_admin', name: 'Super Admin' },
    { key: 'owner', name: 'Owner' },
    { key: 'manager', name: 'Manager' },
    { key: 'accountant', name: 'Accountant' },
    { key: 'warehouse', name: 'Warehouse' },
    { key: 'production', name: 'Production' },
    { key: 'cashier', name: 'Cashier' }
  ];

  const roleRows = await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: { key: role.key },
        update: { name: role.name },
        create: role
      })
    )
  );

  const superAdmin = roleRows.find((role) => role.key === 'super_admin');
  if (superAdmin) {
    for (const permission of permissionRows) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdmin.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: superAdmin.id,
          permissionId: permission.id
        }
      });
    }
  }

  const rolePermissionMap: Record<string, string[]> = {
    owner: [
      'dashboard.view',
      'orders.read',
      'orders.write',
      'orders.calculate',
      'orders.approve',
      'customers.read',
      'customers.write',
      'inventory.read',
      'inventory.write',
      'inventory.reserve',
      'inventory.write_off',
      'finance.read',
      'finance.write',
      'finance.payments',
      'finance.cashbox',
      'production.read',
      'production.write',
      'pricing.read',
      'pricing.write',
      'audit.read'
    ],
    manager: [
      'dashboard.view',
      'orders.read',
      'orders.write',
      'orders.calculate',
      'customers.read',
      'customers.write',
      'inventory.read',
      'inventory.reserve',
      'production.read',
      'production.write',
      'pricing.read'
    ],
    accountant: ['dashboard.view', 'finance.read', 'finance.write', 'finance.payments', 'finance.cashbox', 'audit.read'],
    warehouse: ['dashboard.view', 'inventory.read', 'inventory.write', 'inventory.reserve', 'inventory.write_off'],
    production: ['dashboard.view', 'production.read', 'production.write', 'inventory.read', 'inventory.reserve'],
    cashier: ['dashboard.view', 'finance.read', 'finance.payments', 'finance.cashbox']
  };

  for (const [roleKey, permissionKeys] of Object.entries(rolePermissionMap)) {
    const role = roleRows.find((item) => item.key === roleKey);
    if (!role) continue;
    for (const permissionKey of permissionKeys) {
      const permission = permissionRows.find((item) => item.key === permissionKey);
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }

  const categoryRows = await Promise.all(
    [
      { code: 'paper', name: 'Paper', description: 'Paper and board' },
      { code: 'ink', name: 'Ink', description: 'Printing inks' },
      { code: 'consumables', name: 'Consumables', description: 'Auxiliary production materials' }
    ].map((category) =>
      prisma.materialCategory.upsert({
        where: { code: category.code },
        update: {
          name: category.name,
          description: category.description
        },
        create: category
      })
    )
  );

  const warehouseRows = await Promise.all(
    [
      { code: 'main', name: 'Main Warehouse', description: 'Primary stock location' },
      { code: 'production', name: 'Production Floor', description: 'Short-term production stock' }
    ].map((warehouse) =>
      prisma.warehouse.upsert({
        where: { code: warehouse.code },
        update: {
          name: warehouse.name,
          description: warehouse.description
        },
        create: warehouse
      })
    )
  );

  const paperCategory = categoryRows.find((row) => row.code === 'paper');
  const inkCategory = categoryRows.find((row) => row.code === 'ink');
  const consumablesCategory = categoryRows.find((row) => row.code === 'consumables');

  const [mainWarehouse] = warehouseRows;

  await Promise.all(
    [
      {
        sku: 'PAPER-A2-150',
        name: 'Coated Paper A2 150gsm',
        unit: 'sheet',
        costPrice: 0.35,
        stockQuantity: 10000,
        categoryId: paperCategory?.id
      },
      {
        sku: 'INK-CMYK',
        name: 'CMYK Ink Set',
        unit: 'set',
        costPrice: 85,
        stockQuantity: 120,
        categoryId: inkCategory?.id
      },
      {
        sku: 'LAM-FILM',
        name: 'Lamination Film',
        unit: 'roll',
        costPrice: 12.5,
        stockQuantity: 200,
        categoryId: consumablesCategory?.id
      }
    ].map((material) =>
      prisma.material.upsert({
        where: { sku: material.sku },
        update: {
          name: material.name,
          unit: material.unit,
          costPrice: material.costPrice,
          stockQuantity: material.stockQuantity,
          categoryId: material.categoryId
        },
        create: {
          sku: material.sku,
          name: material.name,
          unit: material.unit,
          costPrice: material.costPrice,
          stockQuantity: material.stockQuantity,
          reservedQuantity: 0,
          categoryId: material.categoryId
        }
      })
    )
  );

  await Promise.all(
    [
      {
        code: 'prepress',
        name: 'Prepress',
        description: 'Design and prepress preparation'
      },
      {
        code: 'printing',
        name: 'Printing',
        description: 'Digital and offset printing'
      },
      {
        code: 'postpress',
        name: 'Postpress',
        description: 'Cutting, lamination, folding, packaging'
      }
    ].map((center) =>
      prisma.workCenter.upsert({
        where: { code: center.code },
        update: {
          name: center.name,
          description: center.description
        },
        create: center
      })
    )
  );

  await Promise.all(
    [
      { code: 'design', name: 'Design', operationType: 'prepress', defaultDurationMin: 60, defaultCost: 15 },
      { code: 'prepress', name: 'Prepress', operationType: 'prepress', defaultDurationMin: 45, defaultCost: 20 },
      { code: 'plate_output', name: 'Plate Output', operationType: 'printing', defaultDurationMin: 30, defaultCost: 12 },
      { code: 'printing', name: 'Printing', operationType: 'printing', defaultDurationMin: 120, defaultCost: 55 },
      { code: 'drying', name: 'Drying', operationType: 'postpress', defaultDurationMin: 40, defaultCost: 8 },
      { code: 'cutting', name: 'Cutting', operationType: 'postpress', defaultDurationMin: 30, defaultCost: 12 },
      { code: 'lamination', name: 'Lamination', operationType: 'postpress', defaultDurationMin: 35, defaultCost: 14 },
      { code: 'creasing', name: 'Creasing', operationType: 'postpress', defaultDurationMin: 20, defaultCost: 9 },
      { code: 'folding', name: 'Folding', operationType: 'postpress', defaultDurationMin: 25, defaultCost: 10 },
      { code: 'packaging', name: 'Packaging', operationType: 'postpress', defaultDurationMin: 15, defaultCost: 6 }
    ].map((template) =>
      prisma.operationTemplate.upsert({
        where: { code: template.code },
        update: {
          name: template.name,
          operationType: template.operationType,
          defaultDurationMin: template.defaultDurationMin,
          defaultCost: template.defaultCost
        },
        create: template
      })
    )
  );

  await Promise.all(
    [
      {
        code: 'digital-press-01',
        name: 'Digital Press 01',
        model: 'Canon C140'
      },
      {
        code: 'cutter-01',
        name: 'Guillotine Cutter 01',
        model: 'Polar 78'
      }
    ].map((machine) =>
      prisma.machine.upsert({
        where: { code: machine.code },
        update: {
          name: machine.name,
          model: machine.model
        },
        create: {
          ...machine,
          workCenterId: null
        }
      })
    )
  );

  await prisma.markupRule.upsert({
    where: { code: 'default-printing' },
    update: {
      name: 'Default printing markup',
      markupPercent: 20,
      fixedAmount: 0,
      isActive: true
    },
    create: {
      code: 'default-printing',
      name: 'Default printing markup',
      markupPercent: 20,
      fixedAmount: 0,
      priority: 1,
      isActive: true
    }
  });

  await prisma.numberSequence.upsert({
    where: { key: 'order' },
    update: {
      prefix: 'ORD-',
      currentValue: 0,
      step: 1,
      padding: 6
    },
    create: {
      key: 'order',
      prefix: 'ORD-',
      currentValue: 0,
      step: 1,
      padding: 6
    }
  });

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bestapp.local' },
    update: {
      fullName: 'System Admin',
      passwordHash,
      isActive: true
    },
    create: {
      email: 'admin@bestapp.local',
      fullName: 'System Admin',
      passwordHash,
      isActive: true
    }
  });

  if (superAdmin) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: superAdmin.id
        }
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: superAdmin.id
      }
    });
  }

  void mainWarehouse;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
