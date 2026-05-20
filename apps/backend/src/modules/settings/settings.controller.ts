import { Body, Controller, Get, Inject, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateCompanySettingsDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get('company')
  @Roles('super_admin', 'owner', 'accountant')
  getCompany() {
    return this.settingsService.getCompanySettings();
  }

  @Patch('company')
  @Roles('super_admin', 'owner')
  updateCompany(@Body() dto: UpdateCompanySettingsDto) {
    return this.settingsService.updateCompanySettings(dto);
  }

  @Get('reference-options')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  getReferenceOptions() {
    return this.settingsService.getReferenceOptions();
  }
}
