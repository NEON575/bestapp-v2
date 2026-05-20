import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateCompanySettingsDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

  getReferenceOptions() {
    return {
      paymentTypes: ['Hesab', 'Kart', 'Nəğd', 'Kassa'],
      orderStatuses: ['Sifariş', 'Hazır', 'Təhvil', 'Ləğv'],
      qaimaStatuses: ['Yazılıb', 'Yazılmayıb', 'Nəğd'],
      productionStages: ['Dizayn', 'Forma', 'Çap', 'Laminasiya', 'Kəsim', 'Əl işi', 'Bitib', 'Ödəniş', 'Poni', 'Özəl kəsim']
    };
  }
}
