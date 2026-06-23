import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { AppController } from './app.controller';
import { PrismaModule } from './common/prisma/prisma.module';
import { MaterialsModule } from './modules/materials/materials.module';

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
    MaterialsModule
  ]
})
export class AppModule {}
