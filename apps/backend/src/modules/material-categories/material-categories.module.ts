import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { MaterialCategoriesController } from './material-categories.controller';
import { MaterialCategoriesService } from './material-categories.service';

@Module({
  imports: [PrismaModule],
  controllers: [MaterialCategoriesController],
  providers: [MaterialCategoriesService]
})
export class MaterialCategoriesModule {}

