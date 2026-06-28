import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateSupplierDto, SupplierListQueryDto, UpdateSupplierDto } from './dto/supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(@Inject(SuppliersService) private readonly suppliersService: SuppliersService) {}

  @Get()
  @Roles('super_admin', 'owner', 'manager')
  findAll(@Query() query: SupplierListQueryDto) {
    return this.suppliersService.findAll(query);
  }

  @Get(':id')
  @Roles('super_admin', 'owner', 'manager')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @Roles('super_admin', 'owner', 'manager')
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'owner', 'manager')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'owner', 'manager')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
