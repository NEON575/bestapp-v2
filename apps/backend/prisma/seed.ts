import { PrismaClient } from '@prisma/client';
import { MATERIAL_CATEGORIES } from '@bestapp/shared';

const prisma = new PrismaClient();

async function main() {
  for (const category of MATERIAL_CATEGORIES) {
    await prisma.materialCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.label,
        isActive: true,
        deletedAt: null
      },
      create: {
        code: category.code,
        name: category.label,
        codePrefix: 'MAT',
        isActive: true
      }
    });
  }

  await prisma.numberSequence.upsert({
    where: { key: 'material' },
    update: {
      prefix: 'MAT-',
      currentValue: 6,
      step: 1,
      padding: 6
    },
    create: {
      key: 'material',
      prefix: 'MAT-',
      currentValue: 6,
      step: 1,
      padding: 6
    }
  });

  const paperCategory = await prisma.materialCategory.findUnique({ where: { code: 'kagiz' } });
  const laminationCategory = await prisma.materialCategory.findUnique({ where: { code: 'laminasiya' } });
  const formCategory = await prisma.materialCategory.findUnique({ where: { code: 'forma' } });

  const seedMaterials = [
    {
      sku: 'MAT-000001',
      categoryId: paperCategory?.id,
      name: 'Ofset 80 qr 64x90',
      unit: 'vərəq',
      gram: 80,
      size: '64x90',
      unitCost: 0.24,
      costPrice: 0.24,
      isActive: true,
      notes: 'Seed material',
      metadata: {
        materialType: 'Kağız',
        gramThickness: '80 qr',
        formatSize: '64x90',
        currencyCode: 'AZN',
        purchasePrice: 0.24,
        aznPrice: 0.24
      }
    },
    {
      sku: 'MAT-000002',
      categoryId: paperCategory?.id,
      name: 'Melovka 170 qr 70x100',
      unit: 'vərəq',
      gram: 170,
      size: '70x100',
      unitCost: 0.45,
      costPrice: 0.45,
      isActive: true,
      notes: 'Seed material',
      metadata: {
        materialType: 'Kağız',
        gramThickness: '170 qr',
        formatSize: '70x100',
        currencyCode: 'AZN',
        purchasePrice: 0.45,
        aznPrice: 0.45
      }
    },
    {
      sku: 'MAT-000003',
      categoryId: paperCategory?.id,
      name: 'Karton 300 qr 70x100',
      unit: 'vərəq',
      gram: 300,
      size: '70x100',
      unitCost: 0.72,
      costPrice: 0.72,
      isActive: true,
      notes: 'Seed material',
      metadata: {
        materialType: 'Karton',
        gramThickness: '300 qr',
        formatSize: '70x100',
        currencyCode: 'AZN',
        purchasePrice: 0.72,
        aznPrice: 0.72
      }
    },
    {
      sku: 'MAT-000004',
      categoryId: laminationCategory?.id,
      name: 'Mat laminasiya',
      unit: 'rulon',
      gram: 30,
      size: '64 sm',
      unitCost: 18,
      costPrice: 18,
      isActive: true,
      notes: 'Seed material',
      metadata: {
        materialType: 'Laminasiya',
        gramThickness: '30 mikron',
        formatSize: '64 sm',
        currencyCode: 'AZN',
        purchasePrice: 18,
        aznPrice: 18
      }
    },
    {
      sku: 'MAT-000005',
      categoryId: laminationCategory?.id,
      name: 'Parlaq laminasiya',
      unit: 'rulon',
      gram: 30,
      size: '64 sm',
      unitCost: 19,
      costPrice: 19,
      isActive: true,
      notes: 'Seed material',
      metadata: {
        materialType: 'Laminasiya',
        gramThickness: '30 mikron',
        formatSize: '64 sm',
        currencyCode: 'AZN',
        purchasePrice: 19,
        aznPrice: 19
      }
    },
    {
      sku: 'MAT-000006',
      categoryId: formCategory?.id,
      name: 'Ofset forma',
      unit: 'ədəd',
      gram: 1,
      size: '70x100',
      unitCost: 8,
      costPrice: 8,
      isActive: true,
      notes: 'Seed material',
      metadata: {
        materialType: 'Forma',
        gramThickness: '1 forma',
        formatSize: '70x100',
        currencyCode: 'AZN',
        purchasePrice: 8,
        aznPrice: 8
      }
    }
  ];

  for (const material of seedMaterials) {
    await prisma.material.upsert({
      where: { sku: material.sku },
      update: {
        ...material,
        categoryId: material.categoryId ?? undefined
      },
      create: {
        ...material,
        categoryId: material.categoryId ?? undefined
      }
    });
  }
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

