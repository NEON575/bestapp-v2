import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateMaterialCategoryParameterDto,
  CreateMaterialCategoryParameterValueDto,
  UpdateMaterialCategoryParameterDto,
  UpdateMaterialCategoryParameterValueDto
} from './dto/material-category-parameter.dto';
import { MaterialCategoriesService } from './material-categories.service';

@ApiTags('material-kateqoriyalar')
@Controller()
export class MaterialCategoriesController {
  constructor(private readonly service: MaterialCategoriesService) {}

  @Get('/material-categories')
  listCategories() {
    return this.service.listCategories();
  }

  @Get('/material-categories/:categoryId/parameters')
  listParameters(@Param('categoryId') categoryId: string) {
    return this.service.listParameters(categoryId);
  }

  @Post('/material-categories/:categoryId/parameters')
  createParameter(@Param('categoryId') categoryId: string, @Body() dto: CreateMaterialCategoryParameterDto) {
    return this.service.createParameter(categoryId, dto);
  }

  @Patch('/material-category-parameters/:id')
  updateParameter(@Param('id') id: string, @Body() dto: UpdateMaterialCategoryParameterDto) {
    return this.service.updateParameter(id, dto);
  }

  @Delete('/material-category-parameters/:id')
  removeParameter(@Param('id') id: string) {
    return this.service.removeParameter(id);
  }

  @Get('/material-category-parameters/:parameterId/values')
  listValues(@Param('parameterId') parameterId: string) {
    return this.service.listValues(parameterId);
  }

  @Post('/material-category-parameters/:parameterId/values')
  createValue(@Param('parameterId') parameterId: string, @Body() dto: CreateMaterialCategoryParameterValueDto) {
    return this.service.createValue(parameterId, dto);
  }

  @Patch('/material-category-parameter-values/:id')
  updateValue(@Param('id') id: string, @Body() dto: UpdateMaterialCategoryParameterValueDto) {
    return this.service.updateValue(id, dto);
  }

  @Delete('/material-category-parameter-values/:id')
  removeValue(@Param('id') id: string) {
    return this.service.removeValue(id);
  }
}

