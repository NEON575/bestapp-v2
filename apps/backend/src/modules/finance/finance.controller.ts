import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateInvoiceDto, CreatePaymentDto, UpdateInvoiceDto } from './dto/finance.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('invoices')
  @Roles('super_admin', 'owner', 'accountant')
  findAllInvoices() {
    return this.financeService.findAllInvoices();
  }

  @Post('invoices')
  @Roles('super_admin', 'owner', 'accountant')
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.financeService.createInvoice(dto);
  }

  @Patch('invoices/:id')
  @Roles('super_admin', 'owner', 'accountant')
  updateInvoice(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.financeService.updateInvoice(id, dto);
  }

  @Delete('invoices/:id')
  @Roles('super_admin', 'owner')
  removeInvoice(@Param('id') id: string) {
    return this.financeService.remove(id);
  }

  @Post('payments')
  @Roles('super_admin', 'owner', 'accountant')
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.financeService.createPayment(dto);
  }
}
