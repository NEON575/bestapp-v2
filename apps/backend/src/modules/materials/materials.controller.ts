import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateMaterialDto, MaterialListQueryDto, UpdateMaterialDto } from './dto/materials.dto';
import { MaterialsService } from './materials.service';

@ApiTags('materiallar')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  list(@Query() query: MaterialListQueryDto) {
    return this.materialsService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.materialsService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateMaterialDto) {
    return this.materialsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.materialsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.materialsService.remove(id);
  }
}

