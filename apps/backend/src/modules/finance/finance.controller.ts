import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user.interface';
import { PaginationQueryDto } from '../../common/query/pagination.dto';
import {
  CreateCashboxDto,
  CreateInvoiceDto,
  CreatePaymentDto,
  UpdateCashboxDto,
  UpdateInvoiceDto
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@Controller('finance')
export class FinanceController {
  constructor(@Inject(FinanceService) private readonly financeService: FinanceService) {}

  @Get('invoices')
  @Roles('super_admin', 'owner', 'accountant')
  findAllInvoices(@Query() query: PaginationQueryDto) {
    return this.financeService.findAllInvoices(query);
  }

  @Get('invoices/:id')
  @Roles('super_admin', 'owner', 'accountant')
  findInvoice(@Param('id') id: string) {
    return this.financeService.findInvoice(id);
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
    return this.financeService.removeInvoice(id);
  }

  @Get('payments')
  @Roles('super_admin', 'owner', 'accountant')
  findAllPayments(@Query() query: PaginationQueryDto) {
    return this.financeService.findAllPayments(query);
  }

  @Get('payments/:id')
  @Roles('super_admin', 'owner', 'accountant')
  findPayment(@Param('id') id: string) {
    return this.financeService.findPayment(id);
  }

  @Post('payments')
  @Roles('super_admin', 'owner', 'accountant', 'cashier')
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.financeService.createPayment(dto);
  }

  @Patch('payments/:id')
  @Roles('super_admin', 'owner', 'accountant')
  updatePayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.financeService.updatePayment(id, dto);
  }

  @Delete('payments/:id')
  @Roles('super_admin', 'owner')
  removePayment(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.financeService.reversePayment(id, user?.sub);
  }

  @Get('receivables')
  @Roles('super_admin', 'owner', 'accountant')
  findReceivables(@Query() query: PaginationQueryDto) {
    return this.financeService.findReceivables(query);
  }

  @Get('payables')
  @Roles('super_admin', 'owner', 'accountant')
  findPayables(@Query() query: PaginationQueryDto) {
    return this.financeService.findPayables(query);
  }

  @Get('cashboxes')
  @Roles('super_admin', 'owner', 'accountant', 'cashier')
  findCashboxes() {
    return this.financeService.findCashboxes();
  }

  @Post('cashboxes')
  @Roles('super_admin', 'owner', 'accountant')
  createCashbox(@Body() dto: CreateCashboxDto) {
    return this.financeService.createCashbox(dto);
  }

  @Patch('cashboxes/:id')
  @Roles('super_admin', 'owner', 'accountant')
  updateCashbox(@Param('id') id: string, @Body() dto: UpdateCashboxDto) {
    return this.financeService.updateCashbox(id, dto);
  }

  @Get('summary')
  @Roles('super_admin', 'owner', 'accountant')
  summary() {
    return this.financeService.summary();
  }
}
