import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CalculationSettingsService } from './calculation-settings.service';
import {
  CalculationSettingsListQueryDto,
  CreateCalculationFormPriceRuleDto,
  CreateCalculationLaminationPriceRuleDto,
  CreateCalculationPrintPriceRuleDto,
  CreateCalculationServicePriceRuleDto,
  UpdateCalculationFormPriceRuleDto,
  UpdateCalculationLaminationPriceRuleDto,
  UpdateCalculationPrintPriceRuleDto,
  UpdateCalculationServicePriceRuleDto
} from './dto/calculation-setting.dto';

@ApiTags('calculation-settings')
@Controller('calculation-settings')
export class CalculationSettingsController {
  constructor(@Inject(CalculationSettingsService) private readonly service: CalculationSettingsService) {}

  @Get('print-prices')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findPrintPrices(@Query() query: CalculationSettingsListQueryDto) {
    return this.service.findPrintPrices(query);
  }

  @Get('print-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  getPrintPrice(@Param('id') id: string) {
    return this.service.getPrintPrice(id);
  }

  @Post('print-prices')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  createPrintPrice(@Body() dto: CreateCalculationPrintPriceRuleDto) {
    return this.service.createPrintPrice(dto);
  }

  @Patch('print-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  updatePrintPrice(@Param('id') id: string, @Body() dto: UpdateCalculationPrintPriceRuleDto) {
    return this.service.updatePrintPrice(id, dto);
  }

  @Delete('print-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  removePrintPrice(@Param('id') id: string) {
    return this.service.removePrintPrice(id);
  }

  @Get('lamination-prices')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findLaminationPrices(@Query() query: CalculationSettingsListQueryDto) {
    return this.service.findLaminationPrices(query);
  }

  @Get('lamination-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  getLaminationPrice(@Param('id') id: string) {
    return this.service.getLaminationPrice(id);
  }

  @Post('lamination-prices')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  createLaminationPrice(@Body() dto: CreateCalculationLaminationPriceRuleDto) {
    return this.service.createLaminationPrice(dto);
  }

  @Patch('lamination-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  updateLaminationPrice(@Param('id') id: string, @Body() dto: UpdateCalculationLaminationPriceRuleDto) {
    return this.service.updateLaminationPrice(id, dto);
  }

  @Delete('lamination-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  removeLaminationPrice(@Param('id') id: string) {
    return this.service.removeLaminationPrice(id);
  }

  @Get('form-prices')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findFormPrices(@Query() query: CalculationSettingsListQueryDto) {
    return this.service.findFormPrices(query);
  }

  @Get('form-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  getFormPrice(@Param('id') id: string) {
    return this.service.getFormPrice(id);
  }

  @Post('form-prices')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  createFormPrice(@Body() dto: CreateCalculationFormPriceRuleDto) {
    return this.service.createFormPrice(dto);
  }

  @Patch('form-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  updateFormPrice(@Param('id') id: string, @Body() dto: UpdateCalculationFormPriceRuleDto) {
    return this.service.updateFormPrice(id, dto);
  }

  @Delete('form-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  removeFormPrice(@Param('id') id: string) {
    return this.service.removeFormPrice(id);
  }

  @Get('service-prices')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findServicePrices(@Query() query: CalculationSettingsListQueryDto) {
    return this.service.findServicePrices(query);
  }

  @Get('service-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  getServicePrice(@Param('id') id: string) {
    return this.service.getServicePrice(id);
  }

  @Post('service-prices')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  createServicePrice(@Body() dto: CreateCalculationServicePriceRuleDto) {
    return this.service.createServicePrice(dto);
  }

  @Patch('service-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  updateServicePrice(@Param('id') id: string, @Body() dto: UpdateCalculationServicePriceRuleDto) {
    return this.service.updateServicePrice(id, dto);
  }

  @Delete('service-prices/:id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  removeServicePrice(@Param('id') id: string) {
    return this.service.removeServicePrice(id);
  }
}
