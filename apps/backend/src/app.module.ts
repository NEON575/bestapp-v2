import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { AppController } from './app.controller';
import { PrismaModule } from './common/prisma/prisma.module';
import { MaterialCategoriesModule } from './modules/material-categories/material-categories.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '.env.example'),
        resolve(process.cwd(), 'apps/backend/.env'),
        resolve(process.cwd(), 'apps/backend/.env.example')
      ]
    }),
    PrismaModule,
    MaterialCategoriesModule,
    MaterialsModule,
    PurchasesModule,
    WarehouseModule
  ]
})
export class AppModule {}
