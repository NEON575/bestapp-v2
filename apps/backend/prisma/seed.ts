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
      { code: 'paper', name: 'Kağız', description: 'Kağız və çap kağızları' },
      { code: 'cardboard', name: 'Karton', description: 'Karton və qalın əsas materiallar' },
      { code: 'ink', name: 'Boya', description: 'Çap boyaları' },
      { code: 'plate', name: 'Forma / Plastina', description: 'Forma və plastina materialları' },
      { code: 'lamination', name: 'Laminasiya', description: 'Laminasiya materialları' },
      { code: 'spiral', name: 'Spiral', description: 'Spiral materialları' },
      { code: 'poni', name: 'Poni', description: 'Poni materialları' },
      { code: 'knife', name: 'Bıçaq', description: 'Bıçaq və kəsim alətləri' },
      { code: 'manual', name: 'Əl işi materialları', description: 'Əl işi üçün köməkçi materiallar' },
      { code: 'chemical', name: 'Kimyəvi maddələr', description: 'Kimyəvi köməkçi maddələr' },
      { code: 'packaging', name: 'Qablaşdırma', description: 'Qablaşdırma materialları' },
      { code: 'other', name: 'Digər', description: 'Digər materiallar' }
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

  const supplierRows = await Promise.all(
    [
      { code: 'STAMP', name: 'StampPressMMC' },
      { code: 'HALAL', name: 'HalalMMC' },
      { code: 'SBS', name: 'SBSMMC' },
      { code: 'TREND', name: 'TrendCTPMMC' }
    ].map((supplier) =>
      prisma.supplier.upsert({
        where: { code: supplier.code },
        update: {
          name: supplier.name,
          isActive: true
        },
        create: {
          ...supplier,
          isActive: true
        }
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
  const laminationCategory = categoryRows.find((row) => row.code === 'lamination');

  const [mainWarehouse] = warehouseRows;

  await Promise.all(
    [
      {
        sku: 'PAPER-A2-150',
        name: 'Coated Paper A2 150gsm',
        unit: 'sheet',
        gram: 150,
        size: 'A2',
        packPrice: 35,
        quantityInPack: 100,
        unitCost: 0.35,
        vatIncluded: true,
        costPrice: 0.35,
        minStockLevel: 1000,
        stockQuantity: 10000,
        categoryId: paperCategory?.id,
        supplierId: supplierRows[0]?.id
      },
      {
        sku: 'INK-CMYK',
        name: 'CMYK Ink Set',
        unit: 'set',
        unitCost: 85,
        costPrice: 85,
        minStockLevel: 20,
        stockQuantity: 120,
        categoryId: inkCategory?.id,
        supplierId: supplierRows[2]?.id
      },
      {
        sku: 'LAM-FILM',
        name: 'Lamination Film',
        unit: 'roll',
        quantityInPack: 1,
        packPrice: 12.5,
        unitCost: 12.5,
        costPrice: 12.5,
        minStockLevel: 30,
        stockQuantity: 200,
        categoryId: laminationCategory?.id,
        supplierId: supplierRows[1]?.id
      }
    ].map((material) =>
      prisma.material.upsert({
        where: { sku: material.sku },
        update: {
          name: material.name,
          unit: material.unit,
          gram: material.gram,
          size: material.size,
          packPrice: material.packPrice ?? 0,
          quantityInPack: material.quantityInPack ?? 1,
          unitCost: material.unitCost ?? material.costPrice,
          vatIncluded: material.vatIncluded ?? false,
          costPrice: material.costPrice,
          minStockLevel: material.minStockLevel,
          stockQuantity: material.stockQuantity,
          categoryId: material.categoryId,
          supplierId: material.supplierId
        },
        create: {
          sku: material.sku,
          name: material.name,
          unit: material.unit,
          gram: material.gram,
          size: material.size,
          packPrice: material.packPrice ?? 0,
          quantityInPack: material.quantityInPack ?? 1,
          unitCost: material.unitCost ?? material.costPrice,
          vatIncluded: material.vatIncluded ?? false,
          costPrice: material.costPrice,
          minStockLevel: material.minStockLevel,
          stockQuantity: material.stockQuantity,
          reservedQuantity: 0,
          categoryId: material.categoryId,
          supplierId: material.supplierId
        }
      })
    )
  );

  await Promise.all(
    [
      {
        code: 'KAGIZ-A4-300',
        name: 'A4 Mat Kagiz',
        gram: 300,
        size: 'A4',
        packPrice: 18,
        sheetsInPack: 100,
        pricePerSheet: 0.18,
        vatIncluded: true,
        unit: 'sheet',
        supplierId: supplierRows[0]?.id
      },
      {
        code: 'KAGIZ-SRA3-170',
        name: 'SRA3 Gloss Kagiz',
        gram: 170,
        size: 'SRA3',
        packPrice: 42,
        sheetsInPack: 250,
        pricePerSheet: 0.168,
        vatIncluded: false,
        unit: 'sheet',
        supplierId: supplierRows[1]?.id
      }
    ].map((paper) =>
      prisma.paper.upsert({
        where: { code: paper.code },
        update: paper,
        create: paper
      })
    )
  );

  await Promise.all(
    [
      { fullName: 'Aysel Mammadova', title: 'Menecer', roleKey: 'manager' },
      { fullName: 'Rashad Aliyev', title: 'Cap operatoru', roleKey: 'production' }
    ].map(async (employee) => {
      const existing = await prisma.employee.findFirst({ where: { fullName: employee.fullName } });

      if (existing) {
        return prisma.employee.update({
          where: { id: existing.id },
          data: {
            title: employee.title,
            roleKey: employee.roleKey,
            isActive: true
          }
        });
      }

      return prisma.employee.create({
        data: {
          fullName: employee.fullName,
          title: employee.title,
          roleKey: employee.roleKey,
          isActive: true
        }
      });
    })
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

  await prisma.appSetting.upsert({
    where: { key: 'ui.preferences' },
    update: {
      valueJson: { language: 'az' },
      isActive: true,
      deletedAt: null
    },
    create: {
      key: 'ui.preferences',
      valueJson: { language: 'az' },
      isActive: true
    }
  });

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  await prisma.cashbox.upsert({
    where: { code: 'MAIN-AZN' },
    update: {
      name: 'Əsas kassa',
      currencyCode: 'AZN',
      openingBalance: 0,
      currentBalance: 0,
      isActive: true
    },
    create: {
      code: 'MAIN-AZN',
      name: 'Əsas kassa',
      currencyCode: 'AZN',
      openingBalance: 0,
      currentBalance: 0,
      isActive: true
    }
  });
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

  const managerRole = roleRows.find((role) => role.key === 'manager');
  const productionRole = roleRows.find((role) => role.key === 'production');

  const seededEmployees = await prisma.employee.findMany({
    where: {
      fullName: { in: ['Aysel Mammadova', 'Rashad Aliyev'] }
    }
  });

  for (const employee of seededEmployees) {
    const roleId = employee.roleKey === 'manager' ? managerRole?.id : employee.roleKey === 'production' ? productionRole?.id : undefined;
    if (!roleId) continue;

    const email = `${employee.fullName.toLowerCase().replace(/\s+/g, '.')}.${employee.id.slice(0, 8)}@bestapp.local`;
    const employeePasswordHash = await bcrypt.hash(`Emp-${employee.id.slice(0, 8)}!`, 10);
    const employeeUser = await prisma.user.upsert({
      where: { email },
      update: {
        fullName: employee.fullName,
        phone: employee.phone,
        isActive: employee.isActive,
        deletedAt: null
      },
      create: {
        email,
        fullName: employee.fullName,
        phone: employee.phone,
        isActive: employee.isActive,
        passwordHash: employeePasswordHash
      }
    });

    await prisma.employee.update({
      where: { id: employee.id },
      data: { userId: employeeUser.id }
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: employeeUser.id,
          roleId
        }
      },
      update: {},
      create: {
        userId: employeeUser.id,
        roleId
      }
    });
  }

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

  const demoCustomers = await Promise.all(
    [
      { name: 'ABC Print', companyName: 'ABC MMC', phone: '+994501110001', taxId: '1301234501', notes: 'seed:customer:abc' },
      { name: 'Baku Store', companyName: 'Baku Store LLC', phone: '+994501110002', taxId: '1401234502', notes: 'seed:customer:baku-store' },
      { name: 'Green Media', companyName: 'Green Media', phone: '+994501110003', taxId: '1501234503', notes: 'seed:customer:green-media' },
      { name: 'Office Line', companyName: 'Office Line', phone: '+994501110004', taxId: '1601234504', notes: 'seed:customer:office-line' }
    ].map(async (customer) => {
      const existing = await prisma.customer.findFirst({
        where: { notes: customer.notes }
      });

      if (existing) {
        return prisma.customer.update({
          where: { id: existing.id },
          data: customer
        });
      }

      return prisma.customer.create({
        data: customer
      });
    })
  );

  const [paperA4, paperSra3] = await Promise.all([
    prisma.paper.findUnique({ where: { code: 'KAGIZ-A4-300' } }),
    prisma.paper.findUnique({ where: { code: 'KAGIZ-SRA3-170' } })
  ]);

  const salesSeeds = [
    {
      marker: 'seed:sales:full-paid',
      customerId: demoCustomers[0]?.id,
      managerId: admin.id,
      paperId: paperA4?.id,
      date: new Date('2026-05-01T09:00:00.000Z'),
      category: 'Vizit kart',
      productName: 'Vizit kart 1000 ədəd',
      quantity: 1000,
      saleAmount: 180,
      paymentAmount: 180,
      paymentType: 'kart',
      bonus: 0,
      customerBonus: 0,
      productionStage: 'bitib',
      deliveryStatus: 'tehvil',
      deliveryDate: new Date('2026-05-02T18:00:00.000Z'),
      paymentStatus: 'odenilib',
      qaimaStatus: 'yazilib',
      qaimaDate: new Date('2026-05-01T10:00:00.000Z'),
      qaimaNumber: 'Q-0001',
      paperCost: 30,
      plateCost: 12,
      printCost: 20,
      laminationCost: 8,
      notes: 'seed:sales:full-paid'
    },
    {
      marker: 'seed:sales:partial-paid',
      customerId: demoCustomers[1]?.id,
      managerId: admin.id,
      paperId: paperSra3?.id,
      date: new Date('2026-05-03T09:00:00.000Z'),
      category: 'Flayer',
      productName: 'A5 flayer 5000 ədəd',
      quantity: 5000,
      saleAmount: 420,
      paymentAmount: 200,
      paymentType: 'hesab',
      bonus: 10,
      customerBonus: 20,
      productionStage: 'cap',
      deliveryStatus: 'hazir',
      deliveryDate: new Date('2026-05-05T18:00:00.000Z'),
      paymentStatus: 'yazilib',
      qaimaStatus: 'yazilib',
      qaimaDate: new Date('2026-05-03T12:00:00.000Z'),
      qaimaNumber: 'Q-0002',
      paperCost: 120,
      plateCost: 18,
      printCost: 60,
      laminationCost: 30,
      notes: 'seed:sales:partial-paid'
    },
    {
      marker: 'seed:sales:no-payment',
      customerId: demoCustomers[2]?.id,
      managerId: admin.id,
      paperId: paperA4?.id,
      date: new Date('2026-05-06T09:00:00.000Z'),
      category: 'Blank',
      productName: 'A4 blank 2000 ədəd',
      quantity: 2000,
      saleAmount: 260,
      paymentAmount: 0,
      paymentType: 'negd',
      bonus: 0,
      customerBonus: 0,
      productionStage: 'dizayn',
      deliveryStatus: 'sifaris',
      paymentStatus: 'yazilib',
      qaimaStatus: 'yazilmayib',
      paperCost: 80,
      plateCost: 14,
      printCost: 42,
      laminationCost: 0,
      notes: 'seed:sales:no-payment'
    },
    {
      marker: 'seed:sales:negative-profit',
      customerId: demoCustomers[3]?.id,
      managerId: admin.id,
      paperId: paperSra3?.id,
      date: new Date('2026-05-07T09:00:00.000Z'),
      category: 'Kataloq',
      productName: 'A4 kataloq 300 ədəd',
      quantity: 300,
      saleAmount: 150,
      paymentAmount: 50,
      paymentType: 'kassa',
      bonus: 5,
      customerBonus: 0,
      productionStage: 'laminasiya',
      deliveryStatus: 'hazir',
      paymentStatus: 'yazilib',
      qaimaStatus: 'negd',
      paperCost: 60,
      plateCost: 25,
      printCost: 50,
      laminationCost: 30,
      notes: 'seed:sales:negative-profit'
    }
  ];

  for (const seed of salesSeeds) {
    const existing = await prisma.salesEntry.findFirst({
      where: { notes: seed.marker }
    });

    const data = {
      customerId: seed.customerId!,
      managerId: seed.managerId,
      paperId: seed.paperId,
      date: seed.date,
      category: seed.category,
      productName: seed.productName,
      quantity: seed.quantity,
      saleAmount: seed.saleAmount,
      saleUnitPrice: seed.quantity > 0 ? seed.saleAmount / seed.quantity : 0,
      paymentAmount: seed.paymentAmount,
      paymentType: seed.paymentType as any,
      bonus: seed.bonus,
      customerBonus: seed.customerBonus,
      remainingDebt: seed.saleAmount - seed.paymentAmount - seed.customerBonus,
      finalRemainingDebt: seed.saleAmount - seed.paymentAmount - seed.customerBonus - seed.bonus,
      productionStage: seed.productionStage as any,
      deliveryStatus: seed.deliveryStatus as any,
      deliveryDate: seed.deliveryDate,
      paymentStatus: seed.paymentStatus as any,
      qaimaStatus: seed.qaimaStatus as any,
      qaimaDate: seed.qaimaDate,
      qaimaNumber: seed.qaimaNumber,
      paperCost: seed.paperCost,
      plateCost: seed.plateCost,
      printCost: seed.printCost,
      specialCutCost: 0,
      knifeCost: 0,
      manualWorkCost: 0,
      spiralCost: 0,
      poniCost: 0,
      otherCost: 0,
      laminationCost: seed.laminationCost,
      totalCost: seed.paperCost + seed.plateCost + seed.printCost + seed.laminationCost,
      profit: seed.saleAmount - seed.bonus - seed.customerBonus - (seed.paperCost + seed.plateCost + seed.printCost + seed.laminationCost),
      profitPercent:
        seed.paperCost + seed.plateCost + seed.printCost + seed.laminationCost > 0
          ? Math.round(
              ((seed.saleAmount - seed.bonus - seed.customerBonus - (seed.paperCost + seed.plateCost + seed.printCost + seed.laminationCost)) /
                (seed.paperCost + seed.plateCost + seed.printCost + seed.laminationCost)) *
                10000
            ) / 100
          : 0,
      notes: seed.marker
    };

    if (existing) {
      await prisma.salesEntry.update({
        where: { id: existing.id },
        data
      });
    } else {
      await prisma.salesEntry.create({ data });
    }
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
