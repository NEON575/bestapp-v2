import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateMaterialDto,
  CreateStockMovementDto,
  ReserveStockDto,
  UpdateMaterialDto,
  WriteOffStockDto
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('materials')
  @Roles('super_admin', 'owner', 'warehouse', 'manager')
  findMaterials() {
    return this.inventoryService.findAllMaterials();
  }

  @Get('materials/:id')
  @Roles('super_admin', 'owner', 'warehouse', 'manager')
  findMaterial(@Param('id') id: string) {
    return this.inventoryService.findOneMaterial(id);
  }

  @Post('materials')
  @Roles('super_admin', 'owner', 'warehouse')
  createMaterial(@Body() dto: CreateMaterialDto) {
    return this.inventoryService.createMaterial(dto);
  }

  @Patch('materials/:id')
  @Roles('super_admin', 'owner', 'warehouse')
  updateMaterial(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.inventoryService.updateMaterial(id, dto);
  }

  @Delete('materials/:id')
  @Roles('super_admin', 'owner')
  removeMaterial(@Param('id') id: string) {
    return this.inventoryService.removeMaterial(id);
  }

  @Get('categories')
  @Roles('super_admin', 'owner', 'warehouse', 'manager')
  listCategories() {
    return this.inventoryService.listCategories();
  }

  @Post('categories')
  @Roles('super_admin', 'owner', 'warehouse')
  createCategory(@Body() dto: { code: string; name: string; description?: string }) {
    return this.inventoryService.createCategory(dto);
  }

  @Get('warehouses')
  @Roles('super_admin', 'owner', 'warehouse', 'manager')
  listWarehouses() {
    return this.inventoryService.findWarehouses();
  }

  @Post('warehouses')
  @Roles('super_admin', 'owner', 'warehouse')
  createWarehouse(@Body() dto: { code: string; name: string; description?: string }) {
    return this.inventoryService.createWarehouse(dto);
  }

  @Get('movements')
  @Roles('super_admin', 'owner', 'warehouse', 'manager', 'production')
  listMovements() {
    return this.inventoryService.listMovements();
  }

  @Post('movements')
  @Roles('super_admin', 'owner', 'warehouse', 'production')
  createMovement(@Body() dto: CreateStockMovementDto) {
    return this.inventoryService.createMovement(dto);
  }

  @Post('reserve')
  @Roles('super_admin', 'owner', 'warehouse', 'manager', 'production')
  reserve(@Body() dto: ReserveStockDto) {
    return this.inventoryService.reserve(dto);
  }

  @Post('reservations/:id/release')
  @Roles('super_admin', 'owner', 'warehouse', 'manager', 'production')
  releaseReservation(@Param('id') id: string) {
    return this.inventoryService.releaseReservation(id);
  }

  @Post('reservations/:id/consume')
  @Roles('super_admin', 'owner', 'warehouse', 'manager', 'production')
  consumeReservation(@Param('id') id: string) {
    return this.inventoryService.consumeReservation(id);
  }

  @Post('write-off')
  @Roles('super_admin', 'owner', 'warehouse', 'production')
  writeOff(@Body() dto: WriteOffStockDto) {
    return this.inventoryService.writeOff(dto);
  }
}
