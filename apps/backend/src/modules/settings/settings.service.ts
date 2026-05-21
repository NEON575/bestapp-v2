import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateSystemOptionDto,
  UpdateAppPreferencesDto,
  UpdateCompanySettingsDto,
  UpdateSystemOptionDto
} from './dto/settings.dto';
import { mergeAppPreferences, normalizeAppLanguage } from '../../common/business/app-preferences';

const DEFAULT_REFERENCE_GROUPS: Array<{
  key: string;
  label: string;
  items: Array<{ value: string; labelAz: string; labelRu: string }>;
}> = [
  {
    key: 'payment_types',
    label: 'Ödəniş növləri',
    items: [
      { value: 'hesab', labelAz: 'Hesab', labelRu: 'Расчётный счёт' },
      { value: 'kart', labelAz: 'Kart', labelRu: 'Карта' },
      { value: 'negd', labelAz: 'Nəğd', labelRu: 'Наличные' },
      { value: 'kassa', labelAz: 'Kassa', labelRu: 'Касса' }
    ]
  },
  {
    key: 'order_statuses',
    label: 'Sifariş statusları',
    items: [
      { value: 'draft', labelAz: 'Sifariş', labelRu: 'Заказ' },
      { value: 'ready', labelAz: 'Hazır', labelRu: 'Готов' },
      { value: 'delivered', labelAz: 'Təhvil', labelRu: 'Выдан' },
      { value: 'cancelled', labelAz: 'Ləğv', labelRu: 'Отменён' }
    ]
  },
  {
    key: 'qaima_statuses',
    label: 'Qaimə statusları',
    items: [
      { value: 'yazilib', labelAz: 'Yazılıb', labelRu: 'Выписана' },
      { value: 'yazilmayib', labelAz: 'Yazılmayıb', labelRu: 'Не выписана' },
      { value: 'negd', labelAz: 'Nəğd', labelRu: 'Наличные' }
    ]
  },
  {
    key: 'production_stages',
    label: 'İstehsal etapları',
    items: [
      { value: 'dizayn', labelAz: 'Dizayn', labelRu: 'Дизайн' },
      { value: 'forma', labelAz: 'Forma', labelRu: 'Форма' },
      { value: 'cap', labelAz: 'Çap', labelRu: 'Печать' },
      { value: 'laminasiya', labelAz: 'Laminasiya', labelRu: 'Ламинация' },
      { value: 'kesim', labelAz: 'Kəsim', labelRu: 'Резка' },
      { value: 'el_isi', labelAz: 'Əl işi', labelRu: 'Ручная работа' },
      { value: 'qablasdirma', labelAz: 'Qablaşdırma', labelRu: 'Упаковка' },
      { value: 'hazir', labelAz: 'Hazır', labelRu: 'Готов' },
      { value: 'tehvil', labelAz: 'Təhvil', labelRu: 'Выдача' }
    ]
  }
];

const DEFAULT_UNITS = [
  'ədəd',
  'list',
  'bağlama',
  'palet',
  'kg',
  'qutu',
  'litr',
  'metr',
  'rulon',
  'banka',
  'dəst',
  'digər'
];

@Injectable()
export class SettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async ensureDefaultSystemOptions() {
    for (const group of DEFAULT_REFERENCE_GROUPS) {
      for (const [index, item] of group.items.entries()) {
        await this.prisma.systemOption.upsert({
          where: {
            groupKey_value: {
              groupKey: group.key,
              value: item.value
            }
          },
          update: {
            labelAz: item.labelAz,
            labelRu: item.labelRu,
            sortOrder: index,
            deletedAt: null
          },
          create: {
            groupKey: group.key,
            value: item.value,
            labelAz: item.labelAz,
            labelRu: item.labelRu,
            sortOrder: index,
            isActive: true
          }
        });
      }
    }
  }

  async getCompanySettings() {
    return this.prisma.companySetting.upsert({
      where: { code: 'main' },
      update: {},
      create: { code: 'main' }
    });
  }

  async updateCompanySettings(dto: UpdateCompanySettingsDto) {
    return this.prisma.companySetting.upsert({
      where: { code: 'main' },
      update: dto,
      create: {
        code: 'main',
        ...dto
      }
    });
  }

  async getAppPreferences() {
    const setting = await this.prisma.appSetting.upsert({
      where: { key: 'ui.preferences' },
      update: {},
      create: {
        key: 'ui.preferences',
        valueJson: { language: 'az' }
      }
    });

    const payload = (setting.valueJson ?? {}) as Record<string, unknown>;
    return {
      language: normalizeAppLanguage(typeof payload.language === 'string' ? payload.language : undefined)
    };
  }

  async updateAppPreferences(dto: UpdateAppPreferencesDto) {
    const current = await this.getAppPreferences();
    const valueJson = mergeAppPreferences(current as Record<string, unknown>, dto);

    await this.prisma.appSetting.upsert({
      where: { key: 'ui.preferences' },
      update: { valueJson },
      create: {
        key: 'ui.preferences',
        valueJson
      }
    });

    return valueJson;
  }

  async listSystemReferenceGroups() {
    await this.ensureDefaultSystemOptions();
    const rows = await this.prisma.systemOption.findMany({
      where: { deletedAt: null },
      orderBy: [{ groupKey: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }]
    });

    const groups = DEFAULT_REFERENCE_GROUPS.map((group) => ({
      key: group.key,
      label: group.label,
      items: rows.filter((row) => row.groupKey === group.key)
    }));

    return {
      groups,
      units: DEFAULT_UNITS
    };
  }

  listUnits() {
    return DEFAULT_UNITS;
  }

  async createSystemOption(dto: CreateSystemOptionDto) {
    return this.prisma.systemOption.create({
      data: {
        groupKey: dto.groupKey,
        value: dto.value,
        labelAz: dto.labelAz,
        labelRu: dto.labelRu,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true
      }
    });
  }

  async updateSystemOption(id: string, dto: UpdateSystemOptionDto) {
    const existing = await this.prisma.systemOption.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException('System option not found');
    }

    return this.prisma.systemOption.update({
      where: { id },
      data: {
        groupKey: dto.groupKey,
        value: dto.value,
        labelAz: dto.labelAz,
        labelRu: dto.labelRu,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive
      }
    });
  }

  async removeSystemOption(id: string) {
    const existing = await this.prisma.systemOption.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException('System option not found');
    }

    return this.prisma.systemOption.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });
  }

  async getReferenceOptions() {
    const { groups } = await this.listSystemReferenceGroups();
    const getLabels = (groupKey: string) =>
      groups
        .find((group) => group.key === groupKey)
        ?.items.filter((item) => item.isActive)
        .map((item) => item.labelAz) ?? [];

    return {
      paymentTypes: getLabels('payment_types'),
      orderStatuses: getLabels('order_statuses'),
      qaimaStatuses: getLabels('qaima_statuses'),
      productionStages: getLabels('production_stages')
    };
  }
}
