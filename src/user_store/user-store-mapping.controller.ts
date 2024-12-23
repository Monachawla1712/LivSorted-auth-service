import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  Delete,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { UserStoreMappingService } from './user-store-mapping.service';
import { UserStoreMappingDto } from './dto/user-store-mapping.dto';
import { Readable } from 'stream';
import { FileInterceptor } from '@nestjs/platform-express';
import { parse } from 'papaparse';
import { UserService } from '../user/user.service';
import { CommonService } from '../core/common/common.service';
import { UserStoreMappingEntity } from './user-store-mapping.entity';
import { UsmBulkUploadBean } from './classes/usm-bulk-upload.bean';
import { UserEntity } from '../user/user.entity';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { ParamsService } from '../user_params/params.service';
import { AmStoreMappingEntity } from './am-store-mapping.entity';
import { AmStoreMappingService } from './am-store-mapping.service';
import { AmStoreMappingRequestDto } from './dto/am-store-mapping-request.dto';
import { AmStoreMappingDto } from './dto/am-store-mapping.dto';
import { TargetAmStoreMappingRequestDto } from './dto/target-am-store-mapping-request.dto';
import { UserManagerMappingService } from '../user_manager/user-manager-mapping.service';

@Controller()
@UseFilters(HttpExceptionFilter)
export class UserStoreMappingController {
  private readonly logger = new CustomLogger(UserStoreMappingController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private userStoreMappingService: UserStoreMappingService,
    private userService: UserService,
    private commonService: CommonService,
    private paramsService: ParamsService,
    private amStoreMappingService: AmStoreMappingService,
    private userManagerMappingService: UserManagerMappingService,
  ) {}

  @Post('/internal/user-store-mapping')
  async createUserStoreMapping(
    @Body() userStoreMappingDto: UserStoreMappingDto,
    @Headers('userId') userId: string,
  ) {
    let userStoreMapping =
      await this.userStoreMappingService.findByUserIdAndStoreId(
        userStoreMappingDto.user_id,
        userStoreMappingDto.store_id,
      );
    if (userStoreMapping == null) {
      if (userStoreMappingDto.is_active == true) {
        const usmCountMap: Map<string, number> =
          await this.userStoreMappingService.buildUsmCountMap([
            userStoreMappingDto.user_id,
          ]);
        const usmLimit: number = await this.paramsService.getNumberParamValue(
          'USM_LIMIT',
          1000,
        );
        if (!this.validateUsmCountLimit(usmCountMap, userId, usmLimit - 1)) {
          throw new HttpException(
            {
              message: 'User store mappings exceeds limit of ' + usmLimit,
            },
            400,
          );
        }
      }
      userStoreMapping =
        await this.userStoreMappingService.createUserStoreMapping(
          userStoreMappingDto,
          userId,
        );
    } else {
      Object.assign(userStoreMapping, userStoreMappingDto);
      userStoreMapping = await this.userStoreMappingService.save(
        userStoreMapping,
      );
    }
    return userStoreMapping;
  }

  @Get('/internal/user-store-mapping')
  async getUserStoreMapping(@Query('userId') userId: string) {
    const userStoreMapping = await this.userStoreMappingService.findByUserId(
      userId,
    );
    return userStoreMapping;
  }

  @Delete('user-store-mapping')
  async deleteUserStoreMapping(
    @Headers('userId') userId,
    @Query('storeId') storeId: string,
  ) {
    if (storeId == null) {
      throw new HttpException(
        { message: 'store id not provided.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const userStoreMapping =
      await this.userStoreMappingService.findByUserIdAndStoreId(
        userId,
        storeId,
      );
    if (userStoreMapping == null) {
      return { success: false, message: 'mapping does not exist' };
    }
    userStoreMapping.is_active = false;
    await this.userStoreMappingService.save(userStoreMapping);
    return { success: true, message: 'user store mapping deleted' };
  }

  private checkMissingHeader(attributes: string[], fieldSet: Set<string>) {
    for (const attribute of attributes) {
      if (!fieldSet.has(attribute)) {
        return attribute;
      }
    }
    return null;
  }

  @Post('admin/user-store-mapping/bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadUsmMappingSheet(@UploadedFile() file, @Headers('userId') userId) {
    const fileBufferInBase64: string = file.buffer.toString('base64');
    const buffer = Buffer.from(fileBufferInBase64, 'base64');
    const dataStream = Readable.from(buffer);
    const results = await this.readCSVData(dataStream);
    const attributes = ['phone_number', 'store_id'];
    const missingHeader = this.checkMissingHeader(
      attributes,
      new Set(results.meta.fields as string[]),
    );
    if (missingHeader != null) {
      throw new HttpException(
        { message: 'Header fields do not contain ' + missingHeader },
        HttpStatus.BAD_REQUEST,
      );
    }
    const parseResult = await this.parseUsmMappings(results);
    parseResult['key'] = null;
    parseResult['headerMapping'] = this.convertToColonSeparatedString(
      results.meta.fields as string[],
    );
    if (parseResult.failedRows.length == 0) {
      const bulkUploadData = await this.commonService.createNewBulkUploadEntry(
        parseResult.successRows,
        'user-store-mapping',
        userId,
      );
      parseResult['key'] = bulkUploadData.accessKey;
      return parseResult;
    } else {
      return parseResult;
    }
  }

  async readCSVData(dataStream): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsedCsv = parse(dataStream, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  private convertToColonSeparatedString(textArray: string[]) {
    let text = '';
    const arrayLength = textArray.length;
    for (let i = 0; i < arrayLength; i++) {
      const val = textArray[i];
      text += val + ':' + val;
      if (i != arrayLength - 1) {
        text += ',';
      }
    }
    return text;
  }

  @Post('admin/user-store-mapping/bulk-upload/confirm')
  async confirmUsmMappingSheetUpload(
    @Headers('userId') userId: string,
    @Query('key') key,
    @Query('cancel') cancel,
  ) {
    const bulkUploadData = await this.commonService.getBulkUploadEntryByKey(
      'user-store-mapping',
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
      await this.userStoreMappingService.upsertUsmMappings(
        bulkUploadData.jsonData.data as UserStoreMappingEntity[],
        userId,
      );
      await this.commonService.saveBulkUploadData(bulkUploadData);
    } else if (cancel == 1) {
      bulkUploadData.status = 0;
      await this.commonService.saveBulkUploadData(bulkUploadData);
    } else {
      throw new HttpException(
        { message: 'Invalid input for cancel' },
        HttpStatus.NOT_FOUND,
      );
    }
    return { success: true };
  }

  private async parseUsmMappings(results: any) {
    const parseResult = { successRows: [], failedRows: [] };
    const phoneNumbers = results.data.map((usm) => {
      if (
        usm.phone_number != null &&
        this.isValidPhoneNumber(usm.phone_number)
      ) {
        return usm.phone_number;
      }
    });
    const usersList: UserEntity[] =
      await this.userService.getUsersFromPhoneNumbers(phoneNumbers);
    const userPhoneMap: Map<string, UserEntity> =
      this.buildUserPhoneMap(usersList);
    const usmCountMap: Map<string, number> =
      await this.userStoreMappingService.buildUsmCountMap(
        usersList.map((e) => e.id),
      );
    const usmLimit: number = await this.paramsService.getNumberParamValue(
      'USM_LIMIT',
      1000,
    );
    for (const usm of results.data) {
      usm.errors = [];
      if (
        usm.phone_number == null ||
        !this.isValidPhoneNumber(usm.phone_number)
      ) {
        usm.errors.push({
          code: 'FIELD_ERROR',
          message: 'phone_number is a required field.',
          field: 'phone_number',
        });
      }
      if (usm.store_id == null) {
        usm.errors.push({
          code: 'FIELD_ERROR',
          message: 'store_id is a required field.',
          field: 'store_id',
        });
      }
      if (usm.active != null && !isNaN(usm.active)) {
        usm.is_active = Number(usm.active) != 0;
      } else {
        usm.is_active = true;
      }
      if (!userPhoneMap.has(usm.phone_number)) {
        usm.errors.push({
          code: 'FIELD_ERROR',
          message: 'phone_number is invalid.',
          field: 'phone_number',
        });
      } else {
        usm['user_id'] = userPhoneMap.get(usm.phone_number).id;
      }
      if (
        usm.is_active == true &&
        !this.validateUsmCountLimit(usmCountMap, usm.user_id, usmLimit - 1)
      ) {
        usm.errors.push({
          code: 'FIELD_ERROR',
          message: 'user store mapping exceeds limit of ' + usmLimit,
          field: 'usm_count',
        });
      }
      const finalUsm = this.commonService.mapper(
        usm,
        new UsmBulkUploadBean(),
        false,
      );
      if (usm.errors.length == 0) {
        parseResult.successRows.push(finalUsm);
      } else {
        parseResult.failedRows.push(finalUsm);
      }
    }
    return parseResult;
  }

  private isValidPhoneNumber(phoneNumber) {
    const phoneNumberPattern = /^[6-9]\d{9}$/;
    return phoneNumberPattern.test(phoneNumber);
  }

  private buildUserPhoneMap(usersList: UserEntity[]): Map<string, UserEntity> {
    const userPhoneMap = new Map<string, UserEntity>();
    for (const user of usersList) {
      userPhoneMap.set(user.phone_number, user);
    }
    return userPhoneMap;
  }

  private validateUsmCountLimit(
    usmCountMap: Map<string, number>,
    userId: string,
    limit: number,
  ): boolean {
    return !usmCountMap.has(userId) || usmCountMap.get(userId) <= limit;
  }

  @Get('/am-store-mapping')
  async getAmStoreMappings(
    @Query('storeIds') storeIds: string,
    @Query('date') dateString: string,
    @Query('showUserDetails') showUserDetails: string,
    @Query('showManagerDetails') showManagerDetails: string,
  ): Promise<AmStoreMappingDto[]> {
    const stores: number[] = storeIds ? storeIds.split(',').map(Number) : null;
    if (
      (showUserDetails == 'true' || showManagerDetails == 'true') &&
      !(stores && stores.length == 1)
    ) {
      throw new HttpException(
        { message: 'Can only view user/manager details for single store' },
        HttpStatus.BAD_REQUEST,
      );
    }
    let date = null;
    if (
      dateString &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateString) &&
      !isNaN(Date.parse(dateString))
    ) {
      date = new Date(dateString);
    } else {
      date = this.commonService.addDays(
        this.commonService.getCurrentIstDateWithoutTime(),
        1,
      );
    }
    const amStoreMappings: AmStoreMappingEntity[] =
      await this.amStoreMappingService.fetchAMStoreMappings(stores, date);
    if (!amStoreMappings || amStoreMappings.length < 1) {
      throw new HttpException(
        { message: 'No AM store mappings found' },
        HttpStatus.NOT_FOUND,
      );
    }
    const response: AmStoreMappingDto[] = [];
    for (const amStoreMapping of amStoreMappings) {
      response.push(
        this.commonService.mapper(
          amStoreMapping,
          new AmStoreMappingDto(),
          false,
        ),
      );
    }
    if (showUserDetails == 'true') {
      // considering for each store there will be only 1 un-expired active mapping
      if (response.length > 1) {
        throw new HttpException(
          {
            message:
              'There are multiple existing AM Mappings for store id: ' +
              stores[0],
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      response.splice(1);
      response[0].amUser =
        await this.userManagerMappingService.getAmUserManagerTree(
          response[0].amUserId,
          date,
          showManagerDetails == 'true',
        );
    }
    return response;
  }

  @Post('/am-store-mapping')
  async upsertAmStoreMapping(
    @Headers('userId') userId,
    @Body() request: AmStoreMappingRequestDto,
  ): Promise<AmStoreMappingDto> {
    const currentDate = this.commonService.getCurrentIstDateWithoutTime();
    const nextDate = this.commonService.addDays(currentDate, 1);
    const existingMappings: AmStoreMappingEntity[] =
      await this.amStoreMappingService.fetchAMStoreMappings(
        [Number(request.storeId)],
        nextDate,
      );
    let existingMapping: AmStoreMappingEntity = null;
    if (existingMappings && existingMappings.length > 0) {
      if (request.onlyInsert == true) {
        throw new HttpException(
          {
            message: 'Existing AM Mapping is not allowed to be overwritten',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      // to make sure each store has only 1 un-expired active mapping
      if (existingMappings.length > 1) {
        throw new HttpException(
          {
            message:
              'There are multiple existing AM Mappings for store id: ' +
              request.storeId,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      existingMapping = existingMappings[0];
    }
    const newMapping: AmStoreMappingEntity = new AmStoreMappingEntity();
    newMapping.storeId = Number(request.storeId);
    newMapping.amUserId = request.amUserId;
    newMapping.startDate = nextDate;
    newMapping.created_by = userId;
    newMapping.updated_by = userId;
    const response: AmStoreMappingDto = await this.commonService.mapper(
      newMapping,
      new AmStoreMappingDto(),
      false,
    );
    response.amUser = await this.userManagerMappingService.getAmUserManagerTree(
      response.amUserId,
      nextDate,
      true,
    );
    if (response.amUser.errorMsg) {
      throw new HttpException(
        {
          message: 'AM ' + response.amUser.errorMsg,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    const amStoreMappings: AmStoreMappingEntity[] = [newMapping];
    if (existingMapping) {
      if (new Date(existingMapping.startDate) > currentDate) {
        existingMapping.isActive = false;
      } else {
        existingMapping.endDate = currentDate;
      }
      existingMapping.updated_by = userId;
      amStoreMappings.push(existingMapping);
    }
    await this.amStoreMappingService.saveAll(amStoreMappings);
    await this.changeL3OwnerStoreTargets(newMapping);
    return response;
  }

  private changeL3OwnerStoreTargets(storeNewEntry: AmStoreMappingEntity) {
    return this.amStoreMappingService.updateL3Owner(
      this.commonService.mapper(
        storeNewEntry,
        new TargetAmStoreMappingRequestDto(),
        false,
      ),
    );
  }
}
