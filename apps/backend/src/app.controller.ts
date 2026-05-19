import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('system')
@Controller()
export class AppController {
  @Get('health')
  @Public()
  health() {
    return {
      status: 'ok',
      service: 'bestapp-backend',
      timestamp: new Date().toISOString()
    };
  }
}
