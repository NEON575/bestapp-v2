import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateUnitDto,
  CreateSystemOptionDto,
  UpdateAppPreferencesDto,
  UpdateCompanySettingsDto,
  UpdateUnitDto,
  UpdateSystemOptionDto
} from './dto/settings.dto';
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

  @Get('preferences')
  @Roles('super_admin', 'owner')
  getPreferences() {
    return this.settingsService.getAppPreferences();
  }

  @Patch('preferences')
  @Roles('super_admin', 'owner')
  updatePreferences(@Body() dto: UpdateAppPreferencesDto) {
    return this.settingsService.updateAppPreferences(dto);
  }

  @Get('reference-options')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  getReferenceOptions() {
    return this.settingsService.getReferenceOptions();
  }

  @Get('units')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  getUnits() {
    return this.settingsService.listUnits();
  }

  @Post('units')
  @Roles('super_admin', 'owner')
  createUnit(@Body() dto: CreateUnitDto) {
    return this.settingsService.createUnit(dto);
  }

  @Patch('units/:id')
  @Roles('super_admin', 'owner')
  updateUnit(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.settingsService.updateUnit(id, dto);
  }

  @Post('units/:id/activate')
  @Roles('super_admin', 'owner')
  activateUnit(@Param('id') id: string) {
    return this.settingsService.activateUnit(id);
  }

  @Post('units/:id/deactivate')
  @Roles('super_admin', 'owner')
  deactivateUnit(@Param('id') id: string) {
    return this.settingsService.deactivateUnit(id);
  }

  @Delete('units/:id')
  @Roles('super_admin', 'owner')
  removeUnit(@Param('id') id: string) {
    return this.settingsService.removeUnit(id);
  }

  @Get('references')
  @Roles('super_admin', 'owner')
  getReferences() {
    return this.settingsService.listSystemReferenceGroups();
  }

  @Post('references')
  @Roles('super_admin', 'owner')
  createReference(@Body() dto: CreateSystemOptionDto) {
    return this.settingsService.createSystemOption(dto);
  }

  @Patch('references/:id')
  @Roles('super_admin', 'owner')
  updateReference(@Param('id') id: string, @Body() dto: UpdateSystemOptionDto) {
    return this.settingsService.updateSystemOption(id, dto);
  }

  @Delete('references/:id')
  @Roles('super_admin', 'owner')
  removeReference(@Param('id') id: string) {
    return this.settingsService.removeSystemOption(id);
  }
}
