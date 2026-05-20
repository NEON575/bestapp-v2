import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PapersService } from './papers.service';
import { CreatePaperDto, PaperQueryDto, UpdatePaperDto } from './dto/papers.dto';

@ApiTags('papers')
@Controller('papers')
export class PapersController {
  constructor(@Inject(PapersService) private readonly papersService: PapersService) {}

  @Get()
  @Roles('super_admin', 'owner', 'manager', 'warehouse', 'accountant')
  findAll(@Query() query: PaperQueryDto) {
    return this.papersService.findAll(query);
  }

  @Get(':id')
  @Roles('super_admin', 'owner', 'manager', 'warehouse', 'accountant')
  findOne(@Param('id') id: string) {
    return this.papersService.findOne(id);
  }

  @Post()
  @Roles('super_admin', 'owner', 'manager', 'warehouse')
  create(@Body() dto: CreatePaperDto) {
    return this.papersService.create(dto);
  }

  @Post('quick-create')
  @Roles('super_admin', 'owner', 'manager', 'warehouse')
  quickCreate(@Body() dto: CreatePaperDto) {
    return this.papersService.quickCreate(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'owner', 'manager', 'warehouse')
  update(@Param('id') id: string, @Body() dto: UpdatePaperDto) {
    return this.papersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'owner')
  remove(@Param('id') id: string) {
    return this.papersService.remove(id);
  }
}
