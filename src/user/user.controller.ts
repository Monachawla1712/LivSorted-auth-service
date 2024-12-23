import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AddUserDeviceDto } from './dto/add-userdevice.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { UserDto } from './dto/user.dto';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { UpdateUserDeviceDto } from './dto/update-userdevice.dto';
import { PosCreateUserDto } from './dto/pos-create-user.dto';
import { UserAddressService } from '../user_address/user_address.service';
import { UserEntity } from './user.entity';
import { UserAddressEntity } from '../user_address/user_address.entity';
import { FindOptionsWhere, ILike, IsNull, Not } from 'typeorm';
import { CommonService } from '../core/common/common.service';
import { UserListBean } from './classes/user-list.bean';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { DevicesEntity } from './devices.entity';
import { APP_NAMES, USER_EVENT_TYPES } from '../core/common/constants';
import { UpdateUserDtoV2 } from './dto/update-user-v2.dto';
import { EasebuzzVaResponseDto } from './dto/easebuzz-va-response.dto';
import { OrderBeanDto } from './dto/order-bean.dto';
import { UpdateUserBlockedDto } from './dto/update-user-blocked.dto';
import { PaymentMethod, PaymentPreference } from './dto/user-pref.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { ParseResult } from '../core/common/dto/parse-result.bean';
import { VipUserUploadBean } from './dto/vip-user-upload.bean';
import { UserAudienceUploadBean } from './dto/user-audience-upload.bean';
import { UserEventsService } from '../user_events/user.events.service';

@Controller('user')
@ApiTags('User')
@UseFilters(HttpExceptionFilter)
export class UserController {
  private readonly logger = new CustomLogger(UserController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private userService: UserService,
    private userAddressService: UserAddressService,
    private commonService: CommonService,
    private userEventService: UserEventsService,
  ) {}

  @Post('/pos/create')
  @ApiBody({ type: PosCreateUserDto })
  async createUserPos(@Body() posCreateUserDto: PosCreateUserDto) {
    let user: UserEntity = null;
    if (posCreateUserDto.phone_number != null) {
      user = await this.userService.getUserFromPhone(
        posCreateUserDto.phone_number,
      );
    }
    let address: UserAddressEntity = null;
    if (user != null) {
      const addresses = await this.userAddressService.getUserAddresses(user.id);
      address =
        addresses != null && addresses.length > 0 ? addresses.at(0) : null;
    } else {
      const userEntity = new UserEntity();
      Object.assign(userEntity, {
        name: posCreateUserDto.name,
        email: posCreateUserDto.email,
        country_code: '+91',
        phone_number: posCreateUserDto.phone_number,
      } as UserEntity);
      user = await this.userService.saveUser(userEntity);
    }
    if (address == null && posCreateUserDto.address != null) {
      await this.userAddressService.createUserAddressFromText(
        user,
        posCreateUserDto.address,
        posCreateUserDto.pincode,
      );
    }
    return { user: user };
  }

  private buildUserSearchFilterMap(
    filtersMap: FindOptionsWhere<UserEntity>,
    phoneNumber: string,
  ) {
    filtersMap.is_active = true;
    filtersMap.is_deleted = false;
    if (phoneNumber) {
      filtersMap.phone_number = ILike(`%${phoneNumber}%`);
    } else {
      filtersMap.phone_number = Not(IsNull());
    }
  }

  @Get()
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 25,
    @Query('phoneNumber') phoneNumber: string,
  ) {
    const filtersMap: FindOptionsWhere<UserEntity> = {};
    this.buildUserSearchFilterMap(filtersMap, phoneNumber);
    const users = await this.userService.getUsers(page, limit, filtersMap);
    const addresses = await this.userAddressService.getUserAddressByUserIds(
      users.data.map((user) => {
        return user.id;
      }),
    );
    const addressMap = await this.getUserAddressMap(addresses);
    users.data = users.data.map((user) => {
      user.address = addressMap.get(user.id);
      return this.commonService.mapper(user, new UserListBean(), false);
    });
    return users;
  }

  // user
  @Post('/create')
  @ApiBody({ type: CreateUserDto })
  createVisitorUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserDto> {
    const user = await this.userService.getUserFromId(id);
    if (user == null) {
      throw new HttpException('user not found', HttpStatus.NOT_FOUND);
    }
    const notificationEvent =
      await this.userEventService.findLastEventByUserIdAndEventType(
        id,
        USER_EVENT_TYPES.NOTIFICATION_PERMISSION,
      );
    if (notificationEvent) {
      user.isNotificationPermissionGranted =
        notificationEvent.data.isNotificationPermissionGranted;
    } else {
      user.isNotificationPermissionGranted = false;
    }
    return user;
  }

  // not in use on partner app
  @Patch(':id')
  @ApiBody({ type: UpdateUserDto })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    let user: UserEntity = await this.getUserById(id);
    for (const key of Object.keys(dto)) {
      if (key != null) {
        user[key] = dto[key];
      }
    }
    user = await this.userService.saveUser(user);
    return user;
  }

  @Post('/device')
  @ApiBody({ type: AddUserDeviceDto })
  async addUserDevice(
    @Headers('appId') appId: string,
    @Headers('appVersion') appVersion: string,
    @Headers('userId') userId: string,
    @Body() addUserDeviceDto: AddUserDeviceDto,
  ) {
    const device = new DevicesEntity();
    Object.assign(device, addUserDeviceDto);
    device.appName = APP_NAMES[appId];
    device.appVersion = appVersion;
    device.userId = userId;
    device.lastAccessedAt = new Date();
    device.updatedBy = userId;
    if (
      device.userId == null ||
      device.deviceId == null ||
      device.appName == null
    ) {
      throw new HttpException(
        {
          message: 'Incomplete Device Information.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.userService.upsertDevice(device);
    return { success: true, message: 'device details updated successfully.' };
  }

  @Get(':id/device-details')
  getUserDevices(@Param('id') id: string) {
    return this.userService.getUserDevices(id);
  }

  @Patch(':id/device-details/:device_id')
  updateUserDevice(
    @Param('id') userId: string,
    @Param('device_id') device_id: string,
    @Body() dto: UpdateUserDeviceDto,
  ) {
    return this.userService.updateUserDevice(userId, device_id, dto);
  }

  @Delete('delete')
  deleteAccount(@Headers('userId') userId) {
    return this.userService.deleteAccount(userId);
  }

  private async getUserAddressMap(addresses: UserAddressEntity[]) {
    const addressMap = new Map<string, UserAddressEntity>();
    for (const address of addresses) {
      addressMap.set(address.user_id, address);
    }
    return addressMap;
  }

  @Patch()
  @ApiBody({ type: UpdateUserDtoV2 })
  async updateUserV2(@Headers('userId') userId, @Body() dto: UpdateUserDtoV2) {
    const user: UserEntity = await this.getUserById(userId);
    const initialWhatsappOptIn = user.whatsapp_opt_in;
    for (const key of Object.keys(dto)) {
      if (key != null) {
        user[key] = dto[key];
      }
    }
    if (user.whatsapp_opt_in != initialWhatsappOptIn) {
      await this.userService.setWhatsappOptIn(user);
    }
    await this.userService.saveUser(user);
  }

  @Patch(':id/block')
  @ApiBody({ type: UpdateUserBlockedDto })
  async updateUserBlocked(
    @Param('id') id: string,
    @Body() dto: UpdateUserBlockedDto,
  ) {
    let user: UserEntity = await this.getUserById(id);
    if (dto?.is_blocked !== null) {
      user.is_blocked = dto.is_blocked;
    }
    user = await this.userService.saveUser(user);
    return user;
  }

  @Post('update-user-preference')
  async updateUserPreference(
    @Headers('userId') userId,
    @Headers('appVersion') appVersion,
    @Query('slot') slot: number,
    @Query('paymentMethod') paymentMethod: PaymentMethod,
    @Query('paymentCollectionMethod') paymentCollectionMethod: PaymentMethod,
    @Query('paymentPreference') paymentPreference: PaymentPreference,
  ) {
    const reqObj = JSON.parse(`{}`);
    reqObj.appVersion = appVersion;
    reqObj.userId = userId;
    reqObj.slot = slot;
    this.logger.log(
      this.asyncContext.get('traceId'),
      'updateUserPreference::'+JSON.stringify(reqObj),
    );
    return await this.userService.updateUserPreference(
      userId,
      slot,
      paymentMethod,
      paymentCollectionMethod,
      paymentPreference,
      appVersion,
    );
  }

  async getUserById(userId: string) {
    const user: UserEntity = await this.userService.getActiveUserById(userId);
    if (user == null) {
      throw new HttpException(
        {
          message: 'User not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return user;
  }

  @Get('easebuzz/virtual-account')
  async getUserEasebuzzVirtualAccountQrCode(@Query('userId') userId: string) {
    let user = await this.getUserById(userId);
    if (user.easebuzzQrCode == null || user.easebuzzVirtualAccountId == null) {
      user = await this.userService.addEasebuzzVirtualAccountIfEligible(user);
      if (
        user.easebuzzVirtualAccountId == null ||
        user.easebuzzQrCode == null
      ) {
        throw new HttpException(
          {
            message:
              'QR code does not exist for this user. Please contact support or retry after 2 minutes.',
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        user = await this.userService.saveUser(user);
      }
    }
    const response = new EasebuzzVaResponseDto();
    response.qrUrl = user.easebuzzQrCode;
    return response;
  }

  @Post('easebuzz/virtual-account/cron')
  async syncUserEasebuzzVirtualAccountCron() {
    try {
      const orderBeans: OrderBeanDto[] =
        await this.userService.getCustomersHavingOrdersToday();
      const customerIds: string[] = orderBeans.map((e) => e.customerId);
      const usersWithoutQr: UserEntity[] =
        await this.userService.getUserWithoutQrFromIds(customerIds);
      const count = usersWithoutQr ? usersWithoutQr.length : 0;
      this.logger.log(
        this.asyncContext.get('traceId'),
        `Creating easebuzz virtual account for ${count} users`,
      );
      if (count > 0) {
        const batchSize = 5;
        const batches = [];
        for (let i = 0; i < usersWithoutQr.length; i += batchSize) {
          batches.push(usersWithoutQr.slice(i, i + batchSize));
        }
        // Process batches sequentially
        for (const batch of batches) {
          // Process stores in a batch parallelly
          await Promise.all(
            batch.map(async (user) => {
              try {
                await this.userService.addEasebuzzVirtualAccountIfEligible(
                  user,
                );
                if (
                  user.easebuzzVirtualAccountId == null ||
                  user.easebuzzQrCode == null
                ) {
                  this.logger.error(
                    this.asyncContext.get('traceId'),
                    'Virtual account details not found while creating easebuzz Qr for user id : ' +
                      user.id,
                    null,
                  );
                } else {
                  await this.userService.saveUser(user);
                }
              } catch (e) {
                this.logger.error(
                  this.asyncContext.get('traceId'),
                  'Error while creating easebuzz virtual account for user id : ' +
                    user.id,
                  e,
                );
              }
            }),
          );
        }
      }
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Error while processing cron for syncing easebuzz virtual accounts',
        e,
      );
    }
  }

  @Post('preferred-slot/cron')
  async syncUserPreferredSlot() {
    try {
      const orderBeans: OrderBeanDto[] =
        await this.userService.getCustomersHavingOrdersToday();
      const customerIds: string[] = orderBeans.map((e) => e.customerId);
      const customerToPreferredSlotMap = new Map<string, number>();
      for (const orderBean of orderBeans) {
        customerToPreferredSlotMap.set(orderBean.customerId, orderBean.slotId);
      }
      const users: UserEntity[] = await this.userService.getUserEntitiesFromIds(
        customerIds,
      );
      const count = users ? users.length : 0;
      this.logger.log(
        this.asyncContext.get('traceId'),
        `Saving preferred slots for ${count} users`,
      );
      if (count > 0) {
        users.map(async (user) => {
          if (
            customerToPreferredSlotMap.has(user.id) &&
            customerToPreferredSlotMap.get(user.id) != null
          ) {
            user.preferredSlotId = customerToPreferredSlotMap.get(user.id);
          }
        });
        this.userService.saveUsers(users);
      }
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Error while saving preferred slots',
        e,
      );
    }
  }

  @Post(':id/next-order-vip')
  @HttpCode(HttpStatus.OK)
  async updateNextOrderAsVip(@Param('id') userId: string) {
    this.userService.updateNextOrderAsVip(userId);
  }

  @Post('backoffice/next-order-vip/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpdateNextOrderAsVip(
    @Headers('userId') userId: string,
    @UploadedFile() file: Multer.File,
  ) {
    const vipUserUploadBeanParseResult =
      await this.validateVipUploadSheetAndParse(file);
    vipUserUploadBeanParseResult.headerMapping =
      VipUserUploadBean.getHeaderMapping();
    if (
      vipUserUploadBeanParseResult.failedRows.length == 0 &&
      vipUserUploadBeanParseResult.successRows.length > 0
    ) {
      const bulkUploadData = await this.commonService.createNewBulkUploadEntry(
        vipUserUploadBeanParseResult.successRows,
        'upload-vip-users',
        userId,
      );

      vipUserUploadBeanParseResult.key = bulkUploadData.accessKey;
    }
    return vipUserUploadBeanParseResult;
  }

  @Post('backoffice/next-order-vip/upload/save')
  @HttpCode(HttpStatus.OK)
  async nextOrderVipSheetUploadSave(
    @Headers('userId') userId: string,
    @Query('key') key: string,
    @Query('cancel') cancel: number,
  ) {
    const bulkUploadData = await this.commonService.getBulkUploadEntryByKey(
      'upload-vip-users',
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
      await this.userService.bulkUpdateVipOrderNum(
        bulkUploadData.jsonData.data as VipUserUploadBean[],
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

  private async validateVipUploadSheetAndParse(file: any) {
    const results = await this.commonService.readCsvData(file);
    const parsedData = this.parseVipUserSheetByHeaderMapping(results.data);
    return await this.userService.validateVipUsersSheetUpload(parsedData);
  }

  private parseVipUserSheetByHeaderMapping(csvRows) {
    const vipUserUploadBeans: VipUserUploadBean[] = [];
    const headerMap = this.commonService.getHeaderMap(
      VipUserUploadBean.getHeaderMapping(),
    );
    for (const csvRow of csvRows) {
      const processedRow = new VipUserUploadBean();
      for (const key of Object.keys(csvRow)) {
        if (headerMap.has(key)) {
          processedRow[headerMap.get(key)] = csvRow[key];
        }
      }
      vipUserUploadBeans.push(processedRow);
    }
    return vipUserUploadBeans;
  }

  @Post('backoffice/audience/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpdateUserAudience(
    @Headers('userId') userId: string,
    @UploadedFile() file: Multer.File,
    @Query('audienceId') audienceId: number,
    @Query('validTill') validTill: Date,
    @Query('include') include: boolean,
  ) {
    const userAudienceUploadBeanParseResult =
      await this.validateAudienceUploadSheetAndParse(
        file,
        Number(audienceId),
        validTill,
        include,
      );
    userAudienceUploadBeanParseResult.headerMapping =
      UserAudienceUploadBean.getHeaderMapping();
    if (
      userAudienceUploadBeanParseResult.failedRows.length == 0 &&
      userAudienceUploadBeanParseResult.successRows.length > 0
    ) {
      const bulkUploadData = await this.commonService.createNewBulkUploadEntry(
        userAudienceUploadBeanParseResult.successRows,
        'upload-user-audience',
        userId,
      );
      userAudienceUploadBeanParseResult.key = bulkUploadData.accessKey;
    }
    return userAudienceUploadBeanParseResult;
  }

  private async validateAudienceUploadSheetAndParse(
    file: any,
    audienceId: number,
    validTill: Date,
    include: any,
  ) {
    const results = await this.commonService.readCsvData(file);
    const parsedData = this.parseUserAudienceSheetByHeaderMapping(results.data);
    return await this.userService.validateUsersAudienceSheetUpload(
      parsedData,
      audienceId,
      validTill,
      include,
    );
  }

  private parseUserAudienceSheetByHeaderMapping(csvRows) {
    const userAudienceUploadBeans: UserAudienceUploadBean[] = [];
    const headerMap = this.commonService.getHeaderMap(
      UserAudienceUploadBean.getHeaderMapping(),
    );
    for (const csvRow of csvRows) {
      const processedRow = new UserAudienceUploadBean();
      for (const key of Object.keys(csvRow)) {
        if (headerMap.has(key)) {
          processedRow[headerMap.get(key)] = csvRow[key];
        }
      }
      userAudienceUploadBeans.push(processedRow);
    }
    return userAudienceUploadBeans;
  }

  @Post('backoffice/audience/upload/save')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateUserAudienceSave(
    @Headers('userId') userId: string,
    @Query('key') key: string,
    @Query('cancel') cancel: number,
  ) {
    const bulkUploadData = await this.commonService.getBulkUploadEntryByKey(
      'upload-user-audience',
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
      await this.userService.bulkUpdateUserAudience(
        bulkUploadData.jsonData.data as UserAudienceUploadBean[],
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
}
