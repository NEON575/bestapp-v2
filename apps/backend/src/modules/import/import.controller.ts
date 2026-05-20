import { Controller, Inject, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../common/decorators/roles.decorator';
import { ImportService } from './import.service';

type UploadedExcelFile = {
  originalname: string;
  buffer: Buffer;
};

@ApiTags('import')
@Controller('import/excel')
export class ImportController {
  constructor(@Inject(ImportService) private readonly importService: ImportService) {}

  @Post('preview')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  preview(@UploadedFile() file: UploadedExcelFile) {
    return this.importService.previewExcel(file);
  }
}
