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
  const vinylCategory = await prisma.materialCategory.findUnique({ where: { code: 'diger_material' } });
  const bannerCategory = await prisma.materialCategory.findUnique({ where: { code: 'diger_material' } });
  const laminationCategory = await prisma.materialCategory.findUnique({ where: { code: 'laminasiya' } });
  const formCategory = await prisma.materialCategory.findUnique({ where: { code: 'forma' } });

  const parameterSeeds = [
    {
      categoryId: paperCategory?.id,
      name: 'Qram',
      sortOrder: 1,
      values: ['80 qr', '90 qr', '115 qr', '130 qr', '170 qr', '250 qr', '300 qr']
    },
    {
      categoryId: paperCategory?.id,
      name: 'Ölçü',
      sortOrder: 2,
      values: ['64x90', '70x100', 'A4', 'A3', 'A2']
    },
    {
      categoryId: paperCategory?.id,
      name: 'Tip',
      sortOrder: 3,
      values: ['Ofset', 'Melovka', 'Karton', 'Kraft']
    },
    {
      categoryId: vinylCategory?.id,
      name: 'Növ',
      sortOrder: 1,
      values: ['Mat', 'Parlaq', 'Şəffaf', 'Perforasiya']
    },
    {
      categoryId: vinylCategory?.id,
      name: 'Ölçü',
      sortOrder: 2,
      values: ['100 sm', '120 sm', '152 sm']
    },
    {
      categoryId: vinylCategory?.id,
      name: 'Yapışqan',
      sortOrder: 3,
      values: ['Ağ yapışqan', 'Boz yapışqan']
    },
    {
      categoryId: bannerCategory?.id,
      name: 'Qalınlıq',
      sortOrder: 1,
      values: ['440 qr', '510 qr']
    },
    {
      categoryId: bannerCategory?.id,
      name: 'Tip',
      sortOrder: 2,
      values: ['Ön işıqlı', 'Arxa işıqlı', 'Mesh']
    },
    {
      categoryId: laminationCategory?.id,
      name: 'Qalınlıq',
      sortOrder: 1,
      values: ['24 mikron', '32 mikron', '75 mikron', '125 mikron']
    },
    {
      categoryId: laminationCategory?.id,
      name: 'Tip',
      sortOrder: 2,
      values: ['Mat', 'Parlaq']
    }
  ];

  for (const parameterSeed of parameterSeeds) {
    if (!parameterSeed.categoryId) continue;

    const existing = await prisma.materialCategoryParameter.findFirst({
      where: {
        categoryId: parameterSeed.categoryId,
        name: parameterSeed.name,
        deletedAt: null
      }
    });

    const parameter = existing
      ? await prisma.materialCategoryParameter.update({
          where: { id: existing.id },
          data: {
            sortOrder: parameterSeed.sortOrder,
            isActive: true,
            deletedAt: null
          }
        })
      : await prisma.materialCategoryParameter.create({
          data: {
            category: { connect: { id: parameterSeed.categoryId } },
            name: parameterSeed.name,
            sortOrder: parameterSeed.sortOrder,
            isActive: true
          }
        });

    for (let index = 0; index < parameterSeed.values.length; index += 1) {
      const valueText = parameterSeed.values[index];
      const existingValue = await prisma.materialCategoryParameterValue.findFirst({
        where: {
          parameterId: parameter.id,
          value: valueText,
          deletedAt: null
        }
      });

      if (existingValue) {
        await prisma.materialCategoryParameterValue.update({
          where: { id: existingValue.id },
          data: {
            sortOrder: index + 1,
            isActive: true,
            deletedAt: null
          }
        });
      } else {
        await prisma.materialCategoryParameterValue.create({
          data: {
            parameter: { connect: { id: parameter.id } },
            value: valueText,
            sortOrder: index + 1,
            isActive: true
          }
        });
      }
    }
  }

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
