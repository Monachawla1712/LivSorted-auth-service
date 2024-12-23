import { AsyncContext } from '@nestjs-steroids/async-context';
import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommonService } from '../core/common/common.service';
import { CustomLogger } from '../core/custom-logger';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { EligibleOffersCreateDto } from './dto/eligible-offers-create.dto';
import { ParseResult } from '../core/common/dto/parse-result.bean';
import { UploadUserOffersRequestDto } from './dto/upload-user-offers-req.dto';
import { UserOffersUploadBean } from './dto/user-offers-upload.bean';
import { UserOffersService } from './user-offers.service';

@Controller('user-offers')
@UseFilters(HttpExceptionFilter)
export class UserOffersController {
  private readonly logger = new CustomLogger(UserOffersController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private userOffersService: UserOffersService,
    private commonService: CommonService,
  ) {}

  @Get()
  async getOffersBySocietyId(
    @Headers('userId') userId: string,
    @Query('societyId') societyId: number,
  ) {
    return await this.userOffersService.getUserEligibleOffersBySocietyId(
      societyId,
      userId,
    );
  }

  @Post('create')
  async createOffers(
    @Headers('userId') userId,
    @Body() dto: EligibleOffersCreateDto,
  ) {
    return await this.userOffersService.createOffers(userId, dto);
  }

  @Post('apply-voucher')
  async applyVoucherOffer(
    @Headers('userId') userId,
    @Headers('appVersion') appVersion: string,
    @Query('societyId') societyId: number,
    @Body('voucherName') signupCode: string,
  ) {
    return await this.userOffersService.applyVoucherOffer(userId, signupCode, societyId, appVersion);
  }

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  async userOffersSheetUpload(
    @UploadedFile() file,
    @Headers('userId') userId: string,
    @Body('requests') uploadUserOffersRequestDto: string,
  ) {
    const userIdsList = await this.validateUploadSheetAndParse(file);
    userIdsList.headerMapping = UserOffersUploadBean.getHeaderMapping();
    if (
      userIdsList.failedRows.length == 0 &&
      userIdsList.successRows.length > 0
    ) {
      const bulkUploadData = await this.commonService.createNewBulkUploadEntry(
        userIdsList.successRows,
        'upload-user-offers',
        userId,
      );

      const parsedUserOfferRequestData: UploadUserOffersRequestDto = JSON.parse(
        uploadUserOffersRequestDto,
      );

      await this.userOffersService.updateUserEligibleOffers(
        bulkUploadData.jsonData.data as UserOffersUploadBean[],
        parsedUserOfferRequestData,
      );
      userIdsList.key = bulkUploadData.accessKey;
    }
    return userIdsList;
  }

  private async validateUploadSheetAndParse(file: any) {
    const results = await this.commonService.readCsvData(file);
    const parsedData = this.parseUserOffersSheetByHeaderMapping(results.data);
    const userOffersUploadBean: ParseResult<UserOffersUploadBean> =
      await this.userOffersService.validateUsersSheetUpload(parsedData);
    return userOffersUploadBean;
  }

  private parseUserOffersSheetByHeaderMapping(csvRows) {
    const userOffersUploadBeans: UserOffersUploadBean[] = [];
    const headerMap = this.commonService.getHeaderMap(
      UserOffersUploadBean.getHeaderMapping(),
    );
    for (const csvRow of csvRows) {
      const processedRow = new UserOffersUploadBean();
      for (const key of Object.keys(csvRow)) {
        if (headerMap.has(key)) {
          processedRow[headerMap.get(key)] = csvRow[key];
        }
      }
      userOffersUploadBeans.push(processedRow);
    }
    return userOffersUploadBeans;
  }

  @Post('onboarding-offer/bulk/disable')
  async disableOffers(
      @Headers('userId') adminId: string,
      @Body() userIds: string[]
  ) {
    this.userOffersService.disableOnboardingOffers(userIds, adminId);
  }
}
