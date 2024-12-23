import {
  Body,
  Controller,
  Post,
  UseFilters,
  Headers,
  Put,
  Param,
  Query,
  HttpException,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UploadedFile, Get,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { SocietyService } from './society.service';
import { CustomLogger } from '../core/custom-logger';
import { SocietyRequest } from './dto/society.request';
import { SocietyUpdatePayload } from './dto/society.update.payload';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { CommonService } from '../core/common/common.service';
import { SocietyActivityUploadBean } from './dto/society.activity.upload.bean.dto';
import { SocietyActivityService } from './society.activity.service';
import { SocietyDto } from "./dto/society.dto";
@Controller('society')
@UseFilters(HttpExceptionFilter)
export class SocietyController {
  private readonly logger = new CustomLogger(SocietyController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private societyService: SocietyService,
    private societyActivityService: SocietyActivityService,
    private commonService: CommonService,
  ) {}
  @Post()
  async createSociety(
    @Headers('userId') updatedBy: string,
    @Body() req: SocietyRequest,
  ) {
    this.logger.log(
      this.asyncContext.get('traceId'),
      `creating society replica for ${req.name}`,
    );
    return await this.societyService.createSociety(req, updatedBy);
  }

  @Post('/bulk-update')
  async bulkUpdateSociety(
    @Headers('userId') updatedBy: string,
    @Body() req: SocietyUpdatePayload,
  ) {
    const payloadSize = Object.keys(req).length;
    if (payloadSize > 50) {
      throw new HttpException(
        'Payload too large',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    await this.societyService.updateSocietyInBulk(req, updatedBy);
  }

  @Put('/:id')
  async updateSociety(
    @Headers('userId') updatedBy: string,
    @Param('id') id: string,
    @Body() req: SocietyRequest,
  ) {
    this.logger.log(
      this.asyncContext.get('traceId'),
      `updating society replica for ${id}`,
    );
    return await this.societyService.updateSociety(id, req, updatedBy);
  }

  @Put('/:id/toggle-active')
  async toggleActive(
    @Headers('userId') updatedBy: string,
    @Param('id') id: number,
    @Query('toggle') toggle: number,
  ) {
    this.logger.log(
      this.asyncContext.get('traceId'),
      `toggling society status for ${id}`,
    );
    return await this.societyService.toggleActive(id, toggle, updatedBy);
  }

  @Post('/activity/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async societyActivityDataUpload(
    @Headers('userId') userId: string,
    @UploadedFile() file: Multer.File,
  ) {
    const societyActivityUploadBeanParseResult =
      await this.validateSocietyActivityUploadSheetAndParse(file);
    societyActivityUploadBeanParseResult.headerMapping = SocietyActivityUploadBean.getHeaderMapping();
    if (
      societyActivityUploadBeanParseResult.failedRows.length == 0 &&
      societyActivityUploadBeanParseResult.successRows.length > 0
    ) {
      const bulkUploadData = await this.commonService.createNewBulkUploadEntry(
        societyActivityUploadBeanParseResult.successRows,
        'upload-society-activity',
        userId,
      );

      societyActivityUploadBeanParseResult.key = bulkUploadData.accessKey;
    }
    return societyActivityUploadBeanParseResult;
  }

  private async validateSocietyActivityUploadSheetAndParse(file: any) {
    const results = await this.commonService.readCsvData(file);
    const parsedData = this.parseSocietyActivitySheetByHeaderMapping(
      results.data,
    );
    return await this.societyActivityService.validateSocietyActivitySheetUpload(
      parsedData,
    );
  }

  private parseSocietyActivitySheetByHeaderMapping(csvRows: any) {
    const societyActivityUploadBeans: SocietyActivityUploadBean[] = [];
    const headerMap = this.commonService.getHeaderMap(
      SocietyActivityUploadBean.getHeaderMapping(),
    );
    for (const csvRow of csvRows) {
      const processedRow = new SocietyActivityUploadBean();
      for (const key of Object.keys(csvRow)) {
        if (headerMap.has(key)) {
          processedRow[headerMap.get(key)] = csvRow[key];
        }
      }
      societyActivityUploadBeans.push(processedRow);
    }
    return societyActivityUploadBeans;
  }

  @Post('/activity/upload/save')
  @HttpCode(HttpStatus.OK)
  async societyActivityDataUploadSave(
    @Headers('userId') userId: string,
    @Query('key') key: string,
    @Query('cancel') cancel: number,
  ) {
    const bulkUploadData = await this.commonService.getBulkUploadEntryByKey(
      'upload-society-activity',
      key,
    );
    if (bulkUploadData == null) {
      throw new HttpException(
        { message: 'No Bulk Upload data found for given key and module.' },
        HttpStatus.NOT_FOUND,
      );
    }
    if (cancel == null) {
      bulkUploadData.status = 1;
      await this.societyActivityService.bulkUploadSocietyActivity(
        bulkUploadData.jsonData.data as SocietyActivityUploadBean[],
        userId,
      );
      await this.commonService.saveBulkUploadData(bulkUploadData);
    } else if (Number(cancel) === 1) {
      bulkUploadData.status = 0;
      await this.commonService.saveBulkUploadData(bulkUploadData);
    } else {
      throw new HttpException(
        { message: 'Invalid input for cancel' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return { success: true };
  }

  @Get('/internal')
  async getSociety(
      @Query('societyIds') societies: string,
  ) {
    const societyIds = societies.split(',').map((society) => parseInt(society));
    return await this.societyService.getBySocietyIds(societyIds) as SocietyDto[];
  }
}
