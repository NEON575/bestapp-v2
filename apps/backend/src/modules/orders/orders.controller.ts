import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user.interface';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { OrderListQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findAll(@Query() query: OrderListQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @Roles('super_admin', 'owner', 'manager')
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'owner', 'manager')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'owner')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  @Post(':id/calculate-price')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  calculatePrice(@Param('id') id: string) {
    return this.ordersService.calculatePrice(id);
  }

  @Post(':id/approve')
  @Roles('super_admin', 'owner', 'manager')
  approve(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.ordersService.approve(id, user?.sub);
  }

  @Post(':id/start-production')
  @Roles('super_admin', 'owner', 'manager', 'production')
  startProduction(@Param('id') id: string) {
    return this.ordersService.startProduction(id);
  }

  @Post(':id/mark-ready')
  @Roles('super_admin', 'owner', 'manager', 'production')
  markReady(@Param('id') id: string) {
    return this.ordersService.markReady(id);
  }

  @Post(':id/deliver')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  deliver(@Param('id') id: string) {
    return this.ordersService.deliver(id);
  }

  @Get(':id/profitability')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  profitability(@Param('id') id: string) {
    return this.ordersService.profitability(id);
  }
}
