import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { OtpDto } from './dto/otp.dto';
import { generate } from 'otp-generator';
import { VerifyOtpDto } from './dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtTokenService } from '../core/jwt-token/jwt-token.service';
import { UserRole } from '../user/enum/user.role';
import { HttpService } from '@nestjs/axios';
import { SmsService } from '../core/sms/sms.service';
import { UserEntity } from '../user/user.entity';
import {
  DataSource,
  In,
  LessThanOrEqual,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { OtpTokensEntity } from './otp-tokens.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { add, isBefore } from 'date-fns';
import { DevicesEntity } from '../user/devices.entity';
import { Config } from '../config/configuration';
import { InjectRepository } from '@nestjs/typeorm';
import { UserStoreRegistrationDto } from './dto/register-franchise-store.dto';
import { UserStoreMappingService } from '../user_store/user-store-mapping.service';
import { UserStoreMappingEntity } from '../user_store/user-store-mapping.entity';
import { firstValueFrom } from 'rxjs';
import { WarehouseStoreResponseData } from './dto/wh-store-data.response';
import * as assert from 'assert';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { RolesEntity } from '../privilege/entity/roles.entity';
import { StoreListDto } from './dto/store-list.dto';
import { StoreListResponse } from './dto/stores-list.response';
import { StoreStatus } from '../user/enum/store.status';
import { RoadmapStatus } from '../user/enum/roadmap.status';
import { LoginAction } from '../user/enum/login-action.enum';
import { ParamsService } from 'src/user_params/params.service';

@Injectable()
export class AuthService {
  private readonly logger = new CustomLogger(AuthService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private jwtTokenService: JwtTokenService,
    private configService: ConfigService<Config, true>,
    private userService: UserService,
    private userStoreMappingService: UserStoreMappingService,
    private httpService: HttpService,
    private smsService: SmsService,
    private paramsService: ParamsService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(OtpTokensEntity)
    private readonly otpTokensRepository: Repository<OtpTokensEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    @InjectRepository(DevicesEntity)
    private readonly devicesRepository: Repository<DevicesEntity>,
    @InjectRepository(UserStoreMappingEntity)
    private readonly userStoreMappingRepository: Repository<UserStoreMappingEntity>,
    @InjectRepository(RolesEntity)
    private readonly rolesRepository: Repository<RolesEntity>,
    private dataSource: DataSource,
  ) {}

  existsInWhitelist(phone_number: string): boolean {
    return this.configService
      .get<string[]>('sms_whitelist')
      .includes(phone_number);
  }

  async useRefreshToken(refreshTokenDto: RefreshTokenDto) {
    let refreshToken: RefreshTokenEntity = null;
    try {
      refreshToken = await this.refreshTokenRepository.findOne({
        where: { token: refreshTokenDto.refresh_token, revoked: false },
      });
      assert(refreshToken != null);
      await this.jwtTokenService.verifyJwt(refreshTokenDto.refresh_token);
      const user = await this.userService.getActiveUserById(
        refreshToken.user_id,
      );
      await this.checkIfUserIsBlocked(user);
      const accessToken = await this.jwtTokenService.getAccessToken(
        user.id,
        user.roles,
      );
      return {
        access_token: accessToken,
        refresh_token: refreshTokenDto.refresh_token,
        user: user,
      };
    } catch (e) {
      if (refreshToken != null) {
        refreshToken.revoked = true;
        await this.refreshTokenRepository.save(refreshToken);
      }
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while using refresh token',
        e,
      );
      throw new HttpException({ message: 'Refresh Token is Invalid' }, 469);
    }
  }

  async logout(userId, logoutDto: LogoutDto) {
    try {
      if (logoutDto.refresh_token) {
        await this.refreshTokenRepository.delete({
          token: logoutDto.refresh_token,
          user_id: userId,
        });
      }
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong deleting refresh token',
        e,
      );
    }
  }

  async validateOTP(otpToken: OtpTokensEntity, verifyOtpDto: VerifyOtpDto) {
    if (otpToken == null)
      throw new HttpException(
        { message: 'OTP not in use' },
        HttpStatus.BAD_REQUEST,
      );

    if (isBefore(otpToken.valid_till, new Date(Date.now()))) {
      otpToken.is_active = false;
      await this.otpTokensRepository.save(otpToken);
      throw new HttpException(
        { message: 'OTP has expired' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (otpToken.retries_count >= otpToken.retries_allowed) {
      throw new HttpException(
        { message: 'OTP retry count exceeded' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (otpToken.otp != verifyOtpDto.otp) {
      otpToken.retries_count = otpToken.retries_count
        ? otpToken.retries_count + 1
        : 1;
      await this.otpTokensRepository.save(otpToken);
      throw new HttpException(
        { message: 'OTP does not match' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getOtp(userId, otpDto: OtpDto) {
    let otp = '';
    const otpDigits: number = await this.paramsService.getNumberParamValue(
      'OTP_DIGITS',
      4,
    );
    for (let i = 1; i <= otpDigits; i++) {
      otp += i;
    }
    if (
      this.configService.get('appEnv') != 'development' &&
      !this.existsInWhitelist(otpDto.phone_number)
    ) {
      otp = generate(otpDigits, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });
    }
    const otp_valid_time = add(new Date(Date.now()), {
      minutes: this.configService.get('otp_expiry_in_minutes'),
    });

    const otpData = await this.otpTokensRepository.findOne({
      where: {
        phone_number: otpDto.phone_number,
        valid_till: MoreThan(new Date(Date.now())),
        is_active: true,
      },
      order: { created_at: 'desc' },
    });

    if (otpData == null) {
      await this.otpTokensRepository.save({
        verification_type: 'GUPSHUP',
        otp: otp,
        phone_number: otpDto.phone_number,
        user_id: userId,
        valid_till: otp_valid_time,
        retries_count: 0,
        is_active: true,
      });
    } else if (otpData.retries_count >= otpData.retries_allowed) {
      throw new HttpException(
        { message: 'OTP retry count exceeded' },
        HttpStatus.BAD_REQUEST,
      );
    } else {
      otp = otpData.otp;
      otpData.retries_count = otpData
        ? otpData.retries_count
          ? otpData.retries_count + 1
          : 1
        : 1;
      otpData.valid_till = otp_valid_time;
      await this.otpTokensRepository.save(otpData);
    }
    return otp;
  }
  async getStores(userId) {
    const userStoreMapping = await this.userStoreMappingRepository.find({
      where: {
        user_id: userId,
        is_active: true,
      },
      select: ['store_id'],
    });

    const stores = [];
    userStoreMapping.forEach((element) => {
      stores.push(element.store_id);
    });
    return this.getStoreInfo(stores);
  }

  async getStoresV2(userId) {
    const userMappedStoreIds =
      await this.userStoreMappingService.getUserMappedStoreIds(userId);
    const response: StoreListDto = new StoreListDto();
    let activeStores: StoreListResponse[] = [];
    if (userMappedStoreIds.length > 0) {
      activeStores = await this.getActiveStoresByStoreIds(userMappedStoreIds);
    }
    response.whData = await this.getStoreInfo(
      activeStores.map((store) => {
        return store.store_id;
      }),
    );
    await this.addTrackingStoreInformation(response, userId);
    await this.addAdditionalStoreInfo(response, activeStores);
    this.addLoginActionAndRoadmapStatus(response, activeStores);
    response.isApprovalRequested = [
      RoadmapStatus.PENDING,
      RoadmapStatus.APPROVED,
    ].includes(response.roadmapStatus);
    return response;
  }

  async getMappedStoresInternal(userId) {
    const userMappedStoreIds =
      await this.userStoreMappingService.getUserMappedStoreIds(userId);
    let stores: StoreListResponse[] = [];
    if (userMappedStoreIds != null && userMappedStoreIds.length > 0) {
      stores = await this.getStoresByFilters({
        store_id: userMappedStoreIds.join(','),
        is_active: 1,
      });
    }
    const response: StoreListDto = new StoreListDto();
    response.whData = await this.getStoreInfo(
      stores.map((store) => {
        return store.store_id;
      }),
    );
    await this.addAdditionalStoreInfo(response, stores);
    return response;
  }

  async getStoreInfo(storeId: string[]): Promise<WarehouseStoreResponseData[]> {
    if (storeId.length == 0) {
      return [];
    }
    try {
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'get',
          baseURL:
            this.configService.get<string>('warehouse_url') +
            '/api/v1/stores?ids=' +
            storeId,
          headers: {
            'content-type': 'application/json',
            'rz-auth-key': this.configService.get<string>('rz_auth_key'),
          },
          timeout: this.configService.get<number>('default_timeout')
        }),
      );
      for (const whresp of resp.data as WarehouseStoreResponseData[]) {
        whresp.active = Number(whresp.active);
      }
      return resp.data;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching store info from warehouse',
        e,
      );
      throw new HttpException(
        { message: 'Something went wrong while fetching data from Warehouse.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async registerFranchiseStore(
    userId,
    registerFranchiseStoreDto: UserStoreRegistrationDto,
  ) {
    let user = await this.userRepository.findOne({
      where: {
        phone_number: registerFranchiseStoreDto.phone_number,
        is_verified: true,
        is_deleted: false,
      },
    });

    if (user != null) {
      throw new HttpException(
        { message: 'User is already registered' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (user == null) {
        const user1 = {
          name: registerFranchiseStoreDto.name,
          phone_number: registerFranchiseStoreDto.phone_number,
          roles: [UserRole.VISITOR, UserRole.FRANCHISEOWNER],
          is_verified: true,
        };

        user = new UserEntity();
        Object.assign(user, user1);

        user = await queryRunner.manager.save(user);

        const userStoreMapping1 = {
          user_id: user.id,
          store_id: registerFranchiseStoreDto.storeId,
        };

        const userStoreMapping = new UserStoreMappingEntity();
        Object.assign(userStoreMapping, userStoreMapping1);

        await queryRunner.manager.save(userStoreMapping);

        await queryRunner.commitTransaction();
      }
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new HttpException(
        { message: 'Something went wrong.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }

    return user;
  }
  async getLastActiveOtp(phoneNumber) {
    return await this.otpTokensRepository.findOne({
      where: {
        phone_number: phoneNumber,
        is_active: true,
      },
      order: { updated_at: 'desc' },
    });
  }
  async getLastActiveVerificationId(phoneNumber) {
    const otpToken = await this.otpTokensRepository.findOne({
      where: {
        phone_number: phoneNumber,
        verification_id: Not('null'),
        is_active: true,
      },
      order: { updated_at: 'desc' },
    });
    return otpToken;
  }

  async removeExpiredOtps(phoneNumber: string) {
    await this.otpTokensRepository.update(
      {
        phone_number: phoneNumber,
        valid_till: LessThanOrEqual(new Date(Date.now())),
        is_active: true,
      },
      { is_active: false },
    );
  }

  async verifyOtpFos(verifyOtpDto: VerifyOtpDto) {
    const otpToken = await this.getLastActiveOtp(verifyOtpDto.phone_number);

    await this.validateOTP(otpToken, verifyOtpDto);

    otpToken.is_active = false;
    await this.otpTokensRepository.save(otpToken);

    const user = await this.userService.getUserFromPhone(
      verifyOtpDto.phone_number,
    );

    if (user == null) {
      throw new HttpException(
        { message: 'This phone number is not registered' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const tokens = await this.jwtTokenService.getTokensNew({
      userId: user.id,
      roles: user.roles,
    });

    await this.refreshTokenRepository.save({
      token: tokens.refresh_token,
      user_id: user.id,
    });

    return { ...tokens, user };
  }

  async getUnverifiedStoresList(userId) {
    try {
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'GET',
          baseURL: this.configService.get<string>('util_url'),
          url: `store-app/fos/user/` + userId + `/unverified-stores`,
          headers: {
            Authorization: this.configService.get<string>('util_token'),
            'content-type': 'application/json',
          },
          timeout: this.configService.get<number>('default_timeout')
        }),
      );
      return resp.data;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching unverified stores from store service',
        e,
      );
      throw new HttpException(
        { message: 'Something went wrong while fetching store data.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async softDeleteOtp(otpToken: OtpTokensEntity) {
    otpToken.is_active = false;
    await this.otpTokensRepository.save(otpToken);
  }

  async saveRefreshToken(refreshToken: RefreshTokenEntity) {
    await this.refreshTokenRepository.save(refreshToken);
  }

  async generateAndSendOtp(userId: string, otpDto: OtpDto) {
    await this.removeExpiredOtps(otpDto.phone_number);
    await this.inactivateAllPreviousFirebaseEntries(otpDto.phone_number);
    const otp = await this.getOtp(userId, otpDto);
    if (
      this.configService.get<string>('appEnv') != 'development' &&
      !this.existsInWhitelist(otpDto.phone_number)
    ) {
      await this.smsService.sendSmsGupshup(
        otpDto.country_code,
        otpDto.phone_number,
        [otp],
      );
      this.logger.log(
        this.asyncContext.get('traceId'),
        'otp sent to : ' + otpDto.phone_number,
      );
    }
  }

  async inactivateStoreSession(storeId) {
    try {
      const storeMappedUsers: string[] = await this.userStoreMappingRepository
        .createQueryBuilder()
        .update({ is_active: false })
        .where({
          store_id: storeId,
          is_active: true,
        })
        .returning('user_id')
        .execute()
        .then((result) => result.raw.map((x) => x.user_id));

      if (storeMappedUsers != null && storeMappedUsers.length > 0) {
        await this.refreshTokenRepository.update(
          {
            user_id: In(storeMappedUsers),
            revoked: false,
          },
          { revoked: true },
        );
      }
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while inactivating session for mapped users',
        e,
      );
      throw new HttpException(
        'Something went wrong while inactivating session for mapped users.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return { success: true };
  }

  async getInternalRoles() {
    return await this.rolesRepository.find({
      where: { active: 1, is_internal: 1 },
    });
  }

  async getStoresByFilters(filters: {
    id?: string;
    store_id?: string;
    is_active?: number;
    store_type?: string;
    status?: string;
    city?: string;
    ownerId?: string;
    get_user_approved?: boolean;
  }): Promise<StoreListResponse[]> {
    try {
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'GET',
          baseURL: this.configService.get<string>('util_url'),
          url: `store-app/store`,
          headers: {
            Authorization: this.configService.get<string>('util_token'),
            'content-type': 'application/json',
          },
          params: filters,
          timeout: this.configService.get<number>('default_timeout')
        }),
      );
      return resp.data;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching stores',
        e,
      );
      throw new HttpException(
        { message: 'Something went wrong while fetching store data.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getTrackingStore(stores: StoreListResponse[]) {
    let pendingStore = null;
    let rejectedStore = null;
    for (const store of stores) {
      if (
        [StoreStatus.UNVERIFIED, StoreStatus.APPROVED].includes(store.status) &&
        pendingStore == null
      ) {
        pendingStore = store;
      }
      if (
        [StoreStatus.REJECTED, StoreStatus.VERIFICATION_FAILED].includes(
          store.status,
        ) &&
        rejectedStore == null
      ) {
        rejectedStore = store;
      }
    }
    return pendingStore || rejectedStore || null;
  }

  private async getActiveStoresByStoreIds(
    storeIds: string[],
  ): Promise<StoreListResponse[]> {
    const stores = await this.getStoresByFilters({
      store_id: storeIds.join(','),
      is_active: 1,
    });
    return stores.filter(
      (store) =>
        store.status === StoreStatus.INFO_VERIFIED ||
        store.status === StoreStatus.VERIFIED,
    );
  }

  private addLoginActionAndRoadmapStatus(
    response: StoreListDto,
    activeStores: StoreListResponse[],
  ) {
    response.action = LoginAction.SHOW_REGISTRATION_PAGE;
    if (response.whData && response.whData.length > 0) {
      if (
        activeStores.length === 1 &&
        activeStores.at(0).metadata.journeyStartTime === null
      ) {
        response.action = LoginAction.SHOW_ROADMAP;
        response.roadmapStatus = RoadmapStatus.VERIFIED;
      } else {
        response.action = LoginAction.SHOW_STORE_LIST;
      }
    } else if (response.trackingStore) {
      response.action = LoginAction.SHOW_ROADMAP;
      const storeStatus = response.trackingStore.status;
      if (storeStatus === StoreStatus.UNVERIFIED) {
        response.roadmapStatus = RoadmapStatus.PENDING;
      } else if (storeStatus === StoreStatus.APPROVED) {
        response.roadmapStatus = RoadmapStatus.APPROVED;
      } else if (storeStatus === StoreStatus.REJECTED) {
        response.roadmapStatus = RoadmapStatus.REJECTED;
      } else {
        response.roadmapStatus = RoadmapStatus.VERIFICATION_FAILED;
      }
    }
  }

  private async addTrackingStoreInformation(response: StoreListDto, userId) {
    if (!response.whData || response.whData.length === 0) {
      const stores = await this.getStoresByFilters({
        ownerId: userId,
        is_active: 1,
      });
      const trackingStore = this.getTrackingStore(stores);
      if (trackingStore?.approvedBy) {
        response.approverDetails = await this.userService.getActiveUserById(
          trackingStore.approvedBy,
        );
      }
      response.trackingStore = trackingStore;
    }
  }

  private async addAdditionalStoreInfo(
    response: StoreListDto,
    stores: StoreListResponse[],
  ) {
    const storesMap = new Map<string, StoreListResponse>();
    for (const store of stores) {
      storesMap.set(store.store_id, store);
    }
    for (const whStore of response.whData) {
      const refStore = storesMap.get(String(whStore.id));
      if (refStore != null) {
        whStore.status = refStore.status;
        whStore.openTime = refStore.open_time;
      }
    }
  }

  async saveFirebaseVerificationId(otpUserId: any, otpDto: OtpDto) {
    await this.inactivateAllPreviousActiveOtpEntries(otpDto.phone_number);
    const otp_valid_time = add(new Date(Date.now()), {
      minutes: this.configService.get('otp_expiry_in_minutes'),
    });
    await this.otpTokensRepository.save({
      verification_type: 'FIREBASE',
      verification_id: otpDto.verificationId,
      phone_number: otpDto.phone_number,
      valid_till: otp_valid_time,
      user_id: otpUserId,
      is_active: true,
      retries_count: 0,
    });
    const user = await this.userRepository.findOne({
      where: {
        phone_number: otpDto.phone_number,
        is_verified: true,
        is_deleted: false,
      },
    });
    let isNewUserFlag = false;
    if (user == null) {
      isNewUserFlag = true;
    }

    return {
      name: user == null ? null : user.name,
      isNewUser: isNewUserFlag,
      success: true,
      message: 'otp sent successfully',
    };
  }

  async validateFirebaseOTP(
    otpToken: OtpTokensEntity,
    verifyOtpDto: VerifyOtpDto,
  ) {
    if (otpToken.verification_id != null) {
      const status = await this.smsService.firebaseApiCall(
        otpToken.verification_id,
        verifyOtpDto.otp,
      );
      if (status != 200) {
        throw new HttpException(
          { message: 'OTP does not match' },
          HttpStatus.BAD_REQUEST,
        );
      }

      let user = await this.userService.getUserFromPhone(
        verifyOtpDto.phone_number,
      );

      if (user == null) {
        user = await this.userRepository.save({
          id: otpToken.user_id,
          phone_number: verifyOtpDto.phone_number,
          roles: [UserRole.VISITOR, UserRole.CONSUMER],
          is_verified: true,
        });
      } else if (user.is_verified == false) {
        user.is_verified = true;
        user = await this.userRepository.save(user);
      }

      const tokens = await this.jwtTokenService.getTokens(user.id, user.roles);
      await this.refreshTokenRepository.save({
        token: tokens.refresh_token,
        user_id: user.id,
      });
      return { ...tokens, user };
    }
  }

  private async inactivateAllPreviousFirebaseEntries(phone_number: string) {
    await this.otpTokensRepository.update(
      {
        phone_number: phone_number,
        verification_id: Not('null'),
        is_active: true,
      },
      { is_active: false },
    );
  }

  private async inactivateAllPreviousActiveOtpEntries(phone_number: string) {
    await this.otpTokensRepository.update(
      {
        phone_number: phone_number,
        is_active: true,
      },
      { is_active: false },
    );
  }

  async checkIfUserIsBlocked(user: UserEntity) {
    if (user != null && user.is_blocked) {
      throw new HttpException(
        {
          message:
            'Your account has been blocked. Please reach out to helpline number.',
        },
        469,
      );
    }
  }
}
