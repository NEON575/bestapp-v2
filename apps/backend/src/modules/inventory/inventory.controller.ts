import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateMaterialDto, CreateStockMovementDto, UpdateMaterialDto } from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('materials')
  @Roles('super_admin', 'owner', 'warehouse', 'manager')
  findAll() {
    return this.inventoryService.findAll();
  }

  @Post('materials')
  @Roles('super_admin', 'owner', 'warehouse')
  create(@Body() dto: CreateMaterialDto) {
    return this.inventoryService.create(dto);
  }

  @Patch('materials/:id')
  @Roles('super_admin', 'owner', 'warehouse')
  update(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.inventoryService.update(id, dto);
  }

  @Delete('materials/:id')
  @Roles('super_admin', 'owner')
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }

  @Post('movements')
  @Roles('super_admin', 'owner', 'warehouse', 'production')
  createMovement(@Body() dto: CreateStockMovementDto) {
    return this.inventoryService.createMovement(dto);
  }
}

