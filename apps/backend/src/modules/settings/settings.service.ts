import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateUnitDto,
  CreateSystemOptionDto,
  UpdateAppPreferencesDto,
  UpdateCompanySettingsDto,
  UpdateUnitDto,
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

const DEFAULT_UNITS: Array<{ value: string; labelAz: string; labelRu: string }> = [
  { value: 'ədəd', labelAz: 'Ədəd', labelRu: 'Штука' },
  { value: 'list', labelAz: 'List', labelRu: 'Лист' },
  { value: 'bağlama', labelAz: 'Bağlama', labelRu: 'Пачка' },
  { value: 'palet', labelAz: 'Palet', labelRu: 'Паллет' },
  { value: 'kg', labelAz: 'Kiloqram', labelRu: 'Килограмм' },
  { value: 'qutu', labelAz: 'Qutu', labelRu: 'Коробка' },
  { value: 'litr', labelAz: 'Litr', labelRu: 'Литр' },
  { value: 'metr', labelAz: 'Metr', labelRu: 'Метр' },
  { value: 'rulon', labelAz: 'Rulon', labelRu: 'Рулон' },
  { value: 'banka', labelAz: 'Banka', labelRu: 'Банка' },
  { value: 'dəst', labelAz: 'Dəst', labelRu: 'Комплект' },
  { value: 'digər', labelAz: 'Digər', labelRu: 'Другое' }
];

@Injectable()
export class SettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async upsertOptionSeed(groupKey: string, value: string, labelAz: string, labelRu: string, sortOrder: number) {
    await this.prisma.systemOption.upsert({
      where: {
        groupKey_value: {
          groupKey,
          value
        }
      },
      update: {
        labelAz,
        labelRu,
        sortOrder,
        deletedAt: null
      },
      create: {
        groupKey,
        value,
        labelAz,
        labelRu,
        sortOrder,
        isActive: true
      }
    });
  }

  private async ensureDefaultSystemOptions() {
    for (const group of DEFAULT_REFERENCE_GROUPS) {
      for (const [index, item] of group.items.entries()) {
        await this.upsertOptionSeed(group.key, item.value, item.labelAz, item.labelRu, index);
      }
    }
  }

  private async ensureDefaultUnits() {
    for (const [index, item] of DEFAULT_UNITS.entries()) {
      await this.upsertOptionSeed('units', item.value, item.labelAz, item.labelRu, index);
    }
  }

  private async getUnitOrThrow(id: string) {
    const existing = await this.prisma.systemOption.findFirst({
      where: { id, groupKey: 'units', deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException('Unit not found');
    }

    return existing;
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
      where: { deletedAt: null, groupKey: { not: 'units' } },
      orderBy: [{ groupKey: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }]
    });

    return {
      groups: DEFAULT_REFERENCE_GROUPS.map((group) => ({
        key: group.key,
        label: group.label,
        items: rows.filter((row) => row.groupKey === group.key)
      }))
    };
  }

  async listUnits() {
    await this.ensureDefaultUnits();
    return this.prisma.systemOption.findMany({
      where: { deletedAt: null, groupKey: 'units' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
  }

  async createUnit(dto: CreateUnitDto) {
    await this.ensureDefaultUnits();
    return this.prisma.systemOption.create({
      data: {
        groupKey: 'units',
        value: dto.value.trim(),
        labelAz: dto.labelAz.trim(),
        labelRu: dto.labelRu.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true
      }
    });
  }

  async updateUnit(id: string, dto: UpdateUnitDto) {
    await this.getUnitOrThrow(id);
    return this.prisma.systemOption.update({
      where: { id },
      data: {
        value: dto.value?.trim(),
        labelAz: dto.labelAz?.trim(),
        labelRu: dto.labelRu?.trim(),
        sortOrder: dto.sortOrder,
        isActive: dto.isActive
      }
    });
  }

  async activateUnit(id: string) {
    await this.getUnitOrThrow(id);
    return this.prisma.systemOption.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null
      }
    });
  }

  async deactivateUnit(id: string) {
    await this.getUnitOrThrow(id);
    return this.prisma.systemOption.update({
      where: { id },
      data: {
        isActive: false
      }
    });
  }

  async removeUnit(id: string) {
    await this.getUnitOrThrow(id);
    return this.prisma.systemOption.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });
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
