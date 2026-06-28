import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { AppController } from './app.controller';
import { PrismaModule } from './common/prisma/prisma.module';
import { CustomersModule } from './modules/customers/customers.module';
import { MaterialCategoriesModule } from './modules/material-categories/material-categories.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CalculationParametersModule } from './modules/calculation-parameters/calculation-parameters.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { CalculationsModule } from './modules/calculations/calculations.module';

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
    CustomersModule,
    MaterialCategoriesModule,
    MaterialsModule,
    PurchasesModule,
    SuppliersModule,
    CalculationParametersModule,
    WarehouseModule,
    CalculationsModule
  ]
})
export class AppModule {}
