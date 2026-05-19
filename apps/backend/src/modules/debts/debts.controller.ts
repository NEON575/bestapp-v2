import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/query/pagination.dto';
import { FinanceService } from '../finance/finance.service';

@ApiTags('debts')
@Controller('debts')
export class DebtsController {
  constructor(private readonly financeService: FinanceService) {}

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
}
