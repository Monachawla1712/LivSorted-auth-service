import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtTokenService } from '../core/jwt-token/jwt-token.service';
import { UserDto } from './dto/user.dto';
import { UserEntity } from './user.entity';
import {
  FindOptionsWhere,
  In,
  IsNull,
  MoreThanOrEqual,
  Raw,
  Repository,
} from 'typeorm';
import { RefreshTokenEntity } from '../auth/refresh-token.entity';
import { DevicesEntity } from './devices.entity';
import { UpdateUserDeviceDto } from './dto/update-userdevice.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { InternalCreateUserDto } from './dto/internal-create-user.dto';
import { UserRole } from './enum/user.role';
import { UserAppListDto } from './dto/user-app.dto';
import { UserAppsEntity } from './user-apps.entity';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { UserDetailsDto } from './dto/user-details.dto';
import { CommonService } from '../core/common/common.service';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config/configuration';
import { WhatsappOptInRequestDto } from './dto/whatsapp_opt_in_request.dto';
import { CreateEasebuzzVAPaymentResponse } from './dto/create-virtual-account-payment-response.dto';
import { OrderBeanDto } from './dto/order-bean.dto';
import {
  PaymentMethod,
  PaymentPreference,
  UserPreferences,
} from './dto/user-pref.dto';
import { EligibleOffersEntity } from 'src/user_offers/user-eligible-offers.entity';
import { AlertErrorBean } from './dto/alert-error.dto';
import { ParamsService } from '../user_params/params.service';
import { ParseResult } from '../core/common/dto/parse-result.bean';
import { ErrorBean } from '../core/common/dto/error.bean';
import { VipUserUploadBean } from './dto/vip-user-upload.bean';
import { EligibleOffers } from './dto/eligible-offers.dto';
import { UserAudienceEntity } from './user-audience.entity';
import { UserAudienceUploadBean } from './dto/user-audience-upload.bean';
import { AudienceEntity } from './audience.entity';
import { AudienceDto } from './dto/audience.dto';
import { SocietyAudienceDto } from './dto/society-audience.dto';
import { UserMetadataDto } from './dto/user-metadata.dto';
import { UserAddressEntity } from '../user_address/user_address.entity';
import { DuplicateUserDto } from './dto/duplicate-user.dto';
import { UserAddressService } from '../user_address/user_address.service';
import { RestApiService } from 'src/core/rest-api-service';
import { UserEventsService } from '../user_events/user.events.service';

@Injectable()
export class UserService {
  private readonly logger = new CustomLogger(UserService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private jwtTokenService: JwtTokenService,
    private restApiService: RestApiService,
    private userAddressService: UserAddressService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    @InjectRepository(DevicesEntity)
    private readonly devicesRepository: Repository<DevicesEntity>,
    @InjectRepository(UserAppsEntity)
    private readonly userAppsRepository: Repository<UserAppsEntity>,
    @InjectRepository(UserAudienceEntity)
    private readonly userAudienceRepository: Repository<UserAudienceEntity>,
    @InjectRepository(AudienceEntity)
    private readonly audienceRepository: Repository<AudienceEntity>,
    private commonService: CommonService,
    private httpService: HttpService,
    private configService: ConfigService<Config, true>,
    private paramsService: ParamsService,
  ) {}

  async getUsers(
    page: number,
    limit: number,
    filterMap: FindOptionsWhere<UserEntity>,
  ) {
    const [stores, total] = await this.userRepository.findAndCount({
      where: filterMap,
      skip: (page - 1) * limit,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    });
    const totalPages = Math.ceil(total / limit);
    return {
      data: stores,
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages: Number(totalPages),
    };
  }

  async createInternalUser(internalCreateUserDto: InternalCreateUserDto) {
    if (!internalCreateUserDto.phone_number)
      return this.userRepository.save({
        roles: [UserRole.VISITOR],
      });

    let user = await this.getUserFromPhone(internalCreateUserDto.phone_number);

    if (user == null) {
      user = await this.userRepository.save({
        ...internalCreateUserDto,
        roles: [UserRole.VISITOR, UserRole.CONSUMER],
      });
    }

    return user;
  }

  async createUser(dto: CreateUserDto) {
    const user = (await this.userRepository.save(dto)) as UserDto;
    const tokens = await this.jwtTokenService.getTokens(user.id, user.roles);

    await this.refreshTokenRepository.save({
      token: tokens.refresh_token,
      user_id: user.id,
    });

    return { user, ...tokens };
  }

  async getUserFromId(id: string): Promise<UserDto> {
    const user = await this.userRepository.findOne({
      where: { id: id, is_deleted: false },
    });
    return user;
  }

  async updateUserPref(
    id: string,
    orderCount: number,
    paymentMethod: PaymentMethod,
    slot: number,
  ): Promise<UserDto> {
    const user = await this.userRepository.findOne({
      where: { id: id },
    });
    if (user == null) {
      throw new HttpException(
        { message: 'User not found' },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (user?.userPreferences == null) {
      user.userPreferences = {};
    }
    if (orderCount) {
      user.userPreferences.orderCount = orderCount;
    }
    if (user.preferredSlotId) {
      user.userPreferences.slot = user.preferredSlotId;
    }
    if (paymentMethod) {
      user.userPreferences.paymentMethod = paymentMethod;
    }
    if (slot) {
      user.userPreferences.slot = Number(slot);
      this.updateUserCartSlot(user.id, slot);
    }
    this.userRepository.save(user);
    return user;
  }

  async updateUserPreference(
    id: string,
    slot: number,
    paymentMethod: PaymentMethod,
    paymentCollectionMethod: PaymentMethod,
    paymentPreference: PaymentPreference,
    appVersion: string,
  ): Promise<UserDto> {
    const user = await this.userRepository.findOne({
      where: { id: id },
    });
    if (user == null) {
      throw new HttpException(
        { message: 'User not found' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (user?.userPreferences == null) {
      user.userPreferences = {};
    }
    //app bug in version before '1.1.102' for setting incorrect slot value
    const recentAppVersion ='1.1.102';
    const isOnValidSlotAppVersion = this.commonService.isVersionGreaterOrEqual(
      appVersion,
      recentAppVersion,
    );
    if (isOnValidSlotAppVersion && slot) {
      user.userPreferences.slot = Number(slot);
      this.updateUserCartSlot(user.id, slot);
    }
    if (paymentMethod) {
      user.userPreferences.paymentMethod = paymentMethod;
    }
    if (paymentCollectionMethod) {
      user.userPreferences.paymentCollectionMethod = paymentCollectionMethod;
      user.userPreferences.paymentMethod = paymentCollectionMethod;
    }
    if (paymentPreference) {
      user.userPreferences.paymentPreference = paymentPreference;
    }
    this.userRepository.save(user);
    return user;
  }

  async updateUserCartSlot(userId: string, slotId: number) {
    let addresses = await this.userAddressService.getUserAddresses(userId);
    const societyId= addresses[0].society_id;
    this.commonService.updateUserCartSlot(userId,slotId,societyId);
  }

  async getUserFromIds(ids: string[]): Promise<UserDto[]> {
    const user = await this.userRepository.find({
      where: { id: In(ids), is_deleted: false },
    });
    return user;
  }

  async getActiveUserFromIds(ids: string[]) {
    const user = await this.userRepository.find({
      where: { id: In(ids), is_deleted: false, is_active: true },
    });
    return user;
  }

  async getUserFromPhone(phone: string) {
    const user = await this.userRepository.findOne({
      where: { phone_number: phone, is_deleted: false },
    });
    return user;
  }

  async getVerifiedUserFromPhone(phone: string) {
    const user = await this.userRepository.findOne({
      where: {
        phone_number: phone,
        is_verified: true,
        is_deleted: false,
      },
    });
    return user;
  }

  async getUserFromPhoneAndCheckRoles(phone: string, rolesList: UserRole[]) {
    const user = await this.userRepository.findOne({
      where: { phone_number: phone, is_deleted: false, is_active: true },
    });
    if (user == null) {
      throw new HttpException(
        { message: 'This phone number is not registered' },
        HttpStatus.BAD_REQUEST,
      );
    }
    this.userRolesError(user, rolesList);
    return user;
  }

  private userRolesError(user: UserEntity, rolesList: UserRole[]) {
    if (!this.checkUserRoles(user, new Set(rolesList))) {
      throw new HttpException(
        { message: 'Forbidden Access' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  checkUserRoles(user: UserEntity, requiredRoles: Set<UserRole>) {
    if (user == null) {
      return false;
    }
    for (const role of user.roles) {
      if (requiredRoles.has(role)) {
        return true;
      }
    }
    return false;
  }

  async upsertDevice(device: DevicesEntity) {
    try {
      return await this.devicesRepository.upsert(device, {
        skipUpdateIfNoValuesChanged: false,
        conflictPaths: ['userId', 'deviceId', 'appName'],
      });
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while saving device information',
        e,
      );
      throw new HttpException(
        { message: e.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserDevices(id: string) {
    return this.devicesRepository.find({
      where: { userId: id, isActive: true },
    });
  }

  async updateUserDevice(
    userId: string,
    device_id: string,
    updateUserDeviceDto: UpdateUserDeviceDto,
  ) {
    await this.devicesRepository.update(
      { userId: userId, deviceId: device_id },
      updateUserDeviceDto,
    );
    // would have to add find check

    return {
      success: true,
      message: 'Details added successfully',
    };
  }

  async deleteAccount(userId) {
    const userWallet = await this.getUserWallet({
      userIds: [userId],
    });
    if (
      userWallet[0] != null &&
      userWallet[0].amount - userWallet[0].walletHold < 0
    ) {
      const walletDueMessage = await this.paramsService.getStringParamValue(
        'WALLET_DUE_MESSAGE',
        '',
      );
      throw new AlertErrorBean({
        title: 'Dues Alert!!',
        image:
          'https://files-sorted-prod.s3.ap-south-1.amazonaws.com/public/Warning.png',
        message: walletDueMessage,
        ctaText: 'Please pay',
        ctalink: 'https://livesorted.com?target=wallet_screen',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    await this.refreshTokenRepository.delete({
      user_id: userId,
    });
    const userEntity = await this.getActiveUserById(userId);
    if (userEntity != null && !userEntity.is_blocked) {
      const user = await this.userRepository.update(
        { id: userId },
        { is_deleted: true },
      );
    }
    return {
      success: true,
      message: 'Your Account is deleted successfully',
    };
  }

  async saveBatch(userAppListDto: UserAppListDto, userId: string) {
    try {
      await this.userAppsRepository
        .createQueryBuilder()
        .insert()
        .values(
          userAppListDto.appList.map((appInfo) => {
            return {
              ...appInfo,
              userId: userId,
              createdBy: userId,
              modifiedBy: userId,
            };
          }),
        )
        .orIgnore('DO NOTHING')
        .execute();
      return true;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while storing user apps info',
        e,
      );
      return false;
    }
  }

  async getUserAppDetails(userId: string, deviceId: string) {
    return await this.userAppsRepository.find({
      where: { userId: userId, deviceId: deviceId, active: 1 },
    });
  }

  async saveUser(userEntity: UserEntity) {
    return await this.userRepository.save(userEntity);
  }

  async getPrepaidUserDate() {
    let date = await this.paramsService.getStringParamValue(
      'PREPAID_USER_DATE',
      null,
    );
    if (date != null) {
      let parsedDate = new Date(date);
      return isNaN(parsedDate.getDate()) ? null : parsedDate;
    }
    return null;
  }

  async getOrCreateUserFromPhoneAndRole(
    phone_number: string,
    userRole: UserRole,
    otpTokenUserId: string,
    appVersion: string,
  ) {
    let user = await this.getUserFromPhone(phone_number);
    let saveUser = false;
    const newOrderFlowVersion = await this.paramsService.getStringParamValue(
        'FIRST_ORDER_FLOW_VERSION',
        '1.1.100',
    );
    const isFirstOrderFlow = this.commonService.isVersionGreaterOrEqual(
        appVersion,
        newOrderFlowVersion,
    );
    if (user == null) {
      saveUser = true;
      user = new UserEntity();
      user.id = otpTokenUserId;
      user.phone_number = phone_number;
      user.roles = [UserRole.VISITOR, userRole];
      user.is_verified = true;
      this.setUserPreferenceWhenNull(user, isFirstOrderFlow);
      this.setUserMetaDataWhenNull(user, isFirstOrderFlow);
      user.eligible_offers = await this.getOnboardingEligibleOffer();
      let prepaidDate = await this.getPrepaidUserDate();
      if (
        user.roles.includes(UserRole.CONSUMER) &&
        prepaidDate != null &&
        new Date() > prepaidDate
      ) {
        user.userPreferences.isPrepaidUser = true;
      } else {
        user.userPreferences.isPrepaidUser = false;
      }
      await this.mapUserToDefaultAudience(user);
    } else {
      if (!user.roles.includes(userRole)) {
        user.roles.push(userRole);
        saveUser = true;
      }
      if (user.is_verified == false) {
        user.is_verified = true;
        saveUser = true;
      }
      const isPreferenceChanged =  this.setUserPreferenceWhenNull(user, isFirstOrderFlow);
      if (isPreferenceChanged) {
        saveUser = true;
      }
      if (!isPreferenceChanged) {
        user.userPreferences.isVoucherEligible =
            user.userPreferences.isVoucherEligible ??
            (user.userPreferences.orderCount == null ||
                user.userPreferences.orderCount === 0);
        saveUser = true;
      }
      if (user.meta_data.isFirstOrderFlow == null &&
          (user.userPreferences.orderCount == null ||
              user.userPreferences.orderCount === 0)) {
        this.setUserMetaDataWhenNull(user, isFirstOrderFlow);
        user.meta_data.isFirstOrderFlow = true;
        saveUser = true;
      }
      if (user.eligible_offers == null) {
        user.eligible_offers = await this.getOnboardingEligibleOffer();
        saveUser = true;
      }
    }
    if (saveUser) {
      user = await this.saveUser(user);
    }
    return user;
  }

  setUserPreferenceWhenNull(user: UserEntity, isFirstOrderFlow: boolean) {
    if (user.userPreferences != null) {
      return false ;
    }
    user.userPreferences = {
      isSearchVisible: true,
      isNewOrderFlow: true,
      isVoucherEligible: true,
      paymentMethod: isFirstOrderFlow ? null : PaymentMethod.DIGITAL,
      paymentCollectionMethod: PaymentMethod.DIGITAL,
      paymentPreference: isFirstOrderFlow
          ? null
          : PaymentPreference.BEFORE_DELIVERY,
    };
    return true;
  }

  setUserMetaDataWhenNull(user: UserEntity, isFirstOrderFlow: boolean) {
    if (user.meta_data != null) {
      return false;
    }
    user.meta_data = {
      isCheckedForFraudAndDuplicacy: false,
      isDuplicateUser: false,
      isFirstOrderFlow: isFirstOrderFlow,
      isSuspectForFraud: false,
    };
    return true;
  }

  async getOnboardingEligibleOffer() {
    const onBoardingOfferName = await this.paramsService.getStringParamValue(
      'ONBOARDING_ELIGIBLE_OFFER_NAME',
      null,
    );
    if (onBoardingOfferName == null) {
      return null;
    }
    const eligible_offer = new EligibleOffers();
    eligible_offer.offerName = onBoardingOfferName;
    eligible_offer.treeGame = onBoardingOfferName == 'tree-game';
    eligible_offer.freeTomatoes = onBoardingOfferName == 'free-tomatoes';
    return eligible_offer;
  }

  async getUsersFromPhoneNumbers(
    phoneNumbers: string[],
  ): Promise<UserEntity[]> {
    return await this.userRepository.find({
      where: {
        phone_number: In(phoneNumbers),
        is_active: true,
        is_deleted: false,
      },
    });
  }

  async getActiveUserById(id: string) {
    return await this.userRepository.findOne({
      where: {
        id: id,
        is_active: true,
        is_deleted: false,
      },
    });
  }

  async getUserEntityMapByIds(
    userIds: string[],
  ): Promise<Map<string, UserEntity>> {
    const users: UserEntity[] = await this.userRepository.find({
      where: { id: In(userIds) },
    });
    return users.reduce((map, item) => {
      map.set(item.id, item);
      return map;
    }, new Map<string, UserEntity>());
  }

  getUserDetailsFromMap(
    userId: string,
    userEntityMap: Map<string, UserEntity>,
  ): UserDetailsDto {
    let userDetailDto;
    if (userEntityMap.has(userId)) {
      const userEntity = userEntityMap.get(userId);
      userDetailDto = this.commonService.mapper(
        userEntity,
        new UserDetailsDto(),
        false,
      );
      if (userEntity.is_active != true) {
        userDetailDto.errorMsg = 'User found as inactive';
      } else if (userEntity.is_deleted != false) {
        userDetailDto.errorMsg = 'User found as deleted';
      }
    } else {
      userDetailDto = new UserDetailsDto();
      userDetailDto.id = userId;
      userDetailDto.errorMsg = 'User not found';
    }
    return userDetailDto;
  }

  async setWhatsappOptIn(user: UserEntity) {
    try {
      const payload = new WhatsappOptInRequestDto();
      payload.userPhone = user.phone_number;
      payload.whatsappOptIn = user.whatsapp_opt_in;
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          baseURL: this.configService.get<string>('util_url'),
          url: 'notification/whatsapp/opt-in',
          headers: {
            Authorization: this.configService.get<string>('util_token'),
            'content-type': 'application/json',
          },
          data: payload,
        }),
      );
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while setting whatsapp opt in ',
        e,
      );
      throw new HttpException(
        { message: 'Something went wrong while setting whatsapp opt in.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async createEasebuzzVirtualAccount(
    userId: string,
    phoneNumber: string,
  ): Promise<CreateEasebuzzVAPaymentResponse> {
    const response: CreateEasebuzzVAPaymentResponse =
      new CreateEasebuzzVAPaymentResponse();
    try {
      const paymentServiceURL =
        this.configService.get<string>('util_url') +
        '/payments/easebuzz/virtual-account';
      const result = await this.restApiService.makeRequest({
        url: paymentServiceURL,
        method: 'POST',
        headers: {
          Authorization: this.configService.get<string>('util_token'),
        },
        data: {
          entityId: userId,
          entityType: 'USER',
          label: phoneNumber,
        },
      });
      Object.assign(response, result);
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while creating easebuzz virtual account: ',
        e,
      );
    }
    return response;
  }

  public async addEasebuzzVirtualAccountIfEligible(
    user: UserEntity,
  ): Promise<UserEntity> {
    if (
      user.id != null &&
      user.is_active == true &&
      user.is_deleted == false &&
      (user.easebuzzVirtualAccountId == null || user.easebuzzQrCode == null)
    ) {
      const easebuzzVirtualAccountInfo: CreateEasebuzzVAPaymentResponse =
        await this.createEasebuzzVirtualAccount(user.id, user.phone_number);
      if (
        easebuzzVirtualAccountInfo.id &&
        easebuzzVirtualAccountInfo.qrCodeUrl
      ) {
        user.easebuzzVirtualAccountId = easebuzzVirtualAccountInfo.id;
        user.easebuzzQrCode = easebuzzVirtualAccountInfo.qrCodeUrl;
      }
    }
    return user;
  }

  public async getCustomersHavingOrdersToday(): Promise<OrderBeanDto[]> {
    const response: OrderBeanDto[] = [];
    try {
      const orderServiceURL =
        this.configService.get<string>('util_url') + '/orders/customer/today';
      const result = await this.restApiService.makeRequest({
        url: orderServiceURL,
        method: 'GET',
        headers: {
          Authorization: this.configService.get<string>('util_token'),
        },
      });
      if (result != null) {
        Object.assign(response, result);
      }
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching customers having order today: ',
        e,
      );
    }
    return response;
  }

  async getUserWithoutQrFromIds(ids: string[]): Promise<UserEntity[]> {
    const users = await this.userRepository.find({
      where: {
        id: In(ids),
        is_deleted: false,
        is_active: true,
        easebuzzQrCode: IsNull(),
      },
    });
    return users;
  }

  async getUserEntitiesFromIds(ids: string[]): Promise<UserEntity[]> {
    const users = await this.userRepository.find({
      where: {
        id: In(ids),
        is_deleted: false,
        is_active: true,
      },
    });
    return users;
  }

  async saveUsers(userEntities: UserEntity[]) {
    return await this.userRepository.save(userEntities);
  }

  async updateUserEligibleOffers(
    id: string,
    eligibleOffer: EligibleOffersEntity,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: id },
    });

    if (user == null) {
      throw new HttpException(
        { message: 'User not found' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!eligibleOffer && user.eligible_offers === null) {
      user.eligible_offers = {
        treeGame: false,
        freeTomatoes: false,
        offerName: 'tree-game',
      };
    } else if (eligibleOffer) {
      const offers = {
        offerName: eligibleOffer.offer_name,
        skus: eligibleOffer.skus,
        terms: eligibleOffer.metadata.terms,
        imageUrl: eligibleOffer.metadata.image_url,
        expiry: eligibleOffer.metadata.expiry,
      };

      const currentDate = new Date();
      const daysAgo = new Date();
      daysAgo.setDate(currentDate.getDate() - Number(offers.expiry));
      const daysAfter = new Date();
      daysAfter.setDate(user.created_at.getDate() + Number(offers.expiry));

      if (
        offers &&
        user.eligible_offers === null &&
        (user.userPreferences === null ||
          user.userPreferences.orderCount === 0 ||
          user.userPreferences.orderCount === undefined)
      ) {
        if (
          offers.offerName == 'free-tomatoes' &&
          user.created_at > daysAgo &&
          eligibleOffer.offer_start < new Date()
        ) {
          user.eligible_offers = {
            skus: offers.skus,
            terms: offers.terms,
            imageUrl: offers.imageUrl,
            expiry: new Date(daysAfter),
            treeGame: false,
            freeTomatoes: true,
            offerName: offers.offerName,
          };
        } else {
          user.eligible_offers = {
            treeGame: false,
            freeTomatoes: false,
            offerName: 'tree-game',
          };
        }
      } else if (user.eligible_offers === null) {
        user.eligible_offers = {
          treeGame: false,
          freeTomatoes: false,
          offerName: 'tree-game',
        };
      }
    }
    this.userRepository.save(user);
    return user;
  }

  async getUserWallet(bulkUserWalletRequest) {
    const userWalletApi =
      this.configService.get<string>('util_url') +
      `/payments/wallet/consumer/internal`;
    try {
      return await this.restApiService.makeRequest({
        url: userWalletApi,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: this.configService.get<string>('util_token'),
        },
        data: bulkUserWalletRequest,
      });
    } catch (e) {
      throw new HttpException(
        {
          message: 'Failed to fetch user wallet.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateNextOrderAsVip(userId: string) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });
    if (user.userPreferences == null) {
      user.userPreferences = new UserPreferences();
    }
    user.userPreferences.vipOrderNum =
      Number(user.userPreferences.orderCount ?? 0) + 1;
    this.userRepository.save(user);
  }

  async bulkUpdateVipOrderNum(vipUserUploadBeans: VipUserUploadBean[]) {
    const phoneToVipOrdersCount = new Map<string, number>();
    vipUserUploadBeans.forEach((userOffers) => {
      if (userOffers.phoneNumber && userOffers.vipOrdersCount != null) {
        phoneToVipOrdersCount.set(
          userOffers.phoneNumber,
          userOffers.vipOrdersCount,
        );
      }
    });
    const users = await this.getUsersFromPhoneNumbers(
      vipUserUploadBeans.map((userOffers) => {
        return userOffers.phoneNumber;
      }),
    );
    users.forEach(async (user) => {
      const vipOrdersCountForUser = phoneToVipOrdersCount.get(
        user.phone_number,
      );
      if (user.userPreferences == null) {
        user.userPreferences = new UserPreferences();
      }
      if (user.userPreferences.orderCount == null) {
        user.userPreferences.orderCount = 0;
      }
      const orderCount = Number(user.userPreferences.orderCount);
      if (vipOrdersCountForUser == null || vipOrdersCountForUser === 0) {
        user.userPreferences.vipOrderNum = orderCount + 1;
      } else {
        user.userPreferences.vipOrderNum = orderCount + Number(vipOrdersCountForUser);
      }
      await this.markOrderAsVip(user);
    });
    this.userRepository.save(users);
  }

  async validateVipUsersSheetUpload(vipUserUploadBeans: VipUserUploadBean[]) {
    const vipUserUploadBeanParseResult = new ParseResult<VipUserUploadBean>();
    if (vipUserUploadBeans.length == 0) {
      vipUserUploadBeanParseResult.failedRows = vipUserUploadBeans;
      return vipUserUploadBeanParseResult;
    }

    const existingUsers = await this.getUsersFromPhoneNumbers(
      vipUserUploadBeans.map((userOffers) => {
        return userOffers.phoneNumber;
      }),
    );

    const existingUserPhoneNumbers = new Set<string>();
    existingUsers?.forEach((user) => {
      existingUserPhoneNumbers.add(user.phone_number);
    });

    for (const user of vipUserUploadBeans) {
      if (!existingUserPhoneNumbers.has(user.phoneNumber)) {
        user.errors.push(
          new ErrorBean('FIELD_ERROR', 'User Phone not found', 'phoneNumber'),
        );
      }
      if (user.errors.length == 0) {
        vipUserUploadBeanParseResult.successRows.push(user);
      } else {
        vipUserUploadBeanParseResult.failedRows.push(user);
      }
    }
    return vipUserUploadBeanParseResult;
  }

  async getUserAudience(userId: string) {
    const currentIstDate = this.commonService.getCurrentIstDateWithoutTime();

    const validAudiences = await this.audienceRepository
      .createQueryBuilder('audience')
      .innerJoin(
        'user_audience',
        'ua',
        'ua.audienceId = audience.id AND ua.entityId = :userId AND ua.entityType = :entityType AND ua.active = :active',
        { userId, entityType: 'USER', active: 1 },
      )
      .where('audience.active = :active', { active: 1 })
      .andWhere(
        '(audience.validTill IS NULL OR audience.validTill >= :currentIstDate)',
        { currentIstDate },
      )
      .getMany();

    return validAudiences.map((audience) => ({
      audienceId: audience.id,
    }));
  }

  private async getValidAudienceByIds(ids: number[]) {
    const currentIstDate = this.commonService.getCurrentIstDateWithoutTime();
    return await this.audienceRepository
      .createQueryBuilder('audience')
      .where('audience.id IN (:...ids)', { ids })
      .andWhere('audience.active = :active', { active: 1 })
      .andWhere(
        '(audience.validTill IS NULL OR audience.validTill >= :currentIstDate)',
        { currentIstDate },
      )
      .getMany();
  }

  getAudiencesByIds(ids: number[]) {
    return this.audienceRepository.findBy({
      id: In(ids),
      active: 1,
    });
  }

  getUserAudiencesByUserIds(userIds: string[]) {
    return this.userAudienceRepository.findBy({
      entityId: In(userIds),
      entityType: 'USER',
      active: 1,
    });
  }

  async validateUsersAudienceSheetUpload(
    userAudienceUploadBeans: UserAudienceUploadBean[],
    audienceId: number,
    validTill: Date,
    include: any,
  ) {
    include = include === 'true' ;
    const userAudienceUploadBeanParseResult =
      new ParseResult<UserAudienceUploadBean>();
    if (userAudienceUploadBeans.length == 0) {
      userAudienceUploadBeanParseResult.failedRows = userAudienceUploadBeans;
      return userAudienceUploadBeanParseResult;
    }

    const existingUsers = await this.getUsersFromPhoneNumbers(
      userAudienceUploadBeans.map((userAudienceMapping) => {
        return userAudienceMapping.phoneNumber.trim();
      }),
    );

    const userPhoneIdMap = new Map<string, string>();
    existingUsers?.forEach((user) => {
      if (user?.phone_number && user?.id) {
        userPhoneIdMap.set(user.phone_number, user.id);
      }
    });

    const audience = await this.getAudienceById(audienceId);
    if (audience == null) {
      throw new HttpException(
        {
          message: 'Audience not found or deactivated',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const processedPhoneNumbers = new Set<string>();

    for (const userAudienceUploadBean of userAudienceUploadBeans) {
      if (userAudienceUploadBean.phoneNumber.trim() == '') {
        userAudienceUploadBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            'Phone Number is required',
            'phoneNumber',
          ),
        );
      } else if (
        !userPhoneIdMap.has(userAudienceUploadBean.phoneNumber.trim())
      ) {
        userAudienceUploadBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'User Phone not found', 'phoneNumber'),
        );
      } else if (
        processedPhoneNumbers.has(userAudienceUploadBean.phoneNumber.trim())
      ) {
        userAudienceUploadBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'Duplicate Phone Number', 'phoneNumber'),
        );
      }

      if (userAudienceUploadBean.errors.length == 0) {
        userAudienceUploadBean.phoneNumber =
          userAudienceUploadBean.phoneNumber.trim();
        userAudienceUploadBean.audienceId = audienceId;
        processedPhoneNumbers.add(userAudienceUploadBean.phoneNumber);
        userAudienceUploadBean.userId = userPhoneIdMap.get(
          userAudienceUploadBean.phoneNumber,
        );
        userAudienceUploadBean.validTill = new Date(validTill);
        userAudienceUploadBeanParseResult.successRows.push(
          userAudienceUploadBean,
        );
        userAudienceUploadBean.include = include;
      } else {
        userAudienceUploadBeanParseResult.failedRows.push(
          userAudienceUploadBean,
        );
      }
    }
    return userAudienceUploadBeanParseResult;
  }

  async bulkUpdateUserAudience(
    userAudienceUploadBeans: UserAudienceUploadBean[],
    adminUserId: string,
  ) {
    if (!userAudienceUploadBeans[0].include) {
      await this.deactivateExistingUserAudience(
        userAudienceUploadBeans[0].audienceId,
        adminUserId,
      );
    }
    const audience = await this.getAudienceById(
      userAudienceUploadBeans[0].audienceId,
    );
    audience.validTill = userAudienceUploadBeans[0].validTill;
    audience.modifiedAt = new Date();
    audience.modifiedBy = adminUserId;
    await this.saveAudience(audience);

    const userAudienceEntities = [];
    for (const userAudienceUploadBean of userAudienceUploadBeans) {
      const userAudience = new UserAudienceEntity();
      userAudience.audienceId = audience.id;
      userAudience.entityId = userAudienceUploadBean.userId;
      userAudience.entityType = 'USER';
      userAudience.active = 1;
      userAudience.createdBy = adminUserId;
      userAudience.modifiedBy = adminUserId;
      userAudienceEntities.push(userAudience);
    }
    await this.commonService.processInBatches(userAudienceEntities, 1000, async (batch) => {
      await this.saveAllUserAudiences(batch);
    });
  }

  public async saveAllUserAudiences(userAudiences: any[]) {
    await this.userAudienceRepository.save(userAudiences);
  }

  async deactivateDefaultAudienceUsers(userId) {
    this.userAudienceRepository
      .createQueryBuilder()
      .update()
      .set({ active: 0, modifiedBy: userId, modifiedAt: new Date() })
      .where('audience_id = :audienceId', { audienceId: -1 })
      .andWhere('active = :active', { active: 1 })
      .execute();
  }

  async getAudienceById(id: number) {
    return this.audienceRepository.findOne({
      where: {
        id: id,
        active: 1,
      },
    });
  }

  async mapUserToDefaultAudience(user: UserEntity) {
    const onBoardingAudience = await this.getAudienceById(-1);
    if (onBoardingAudience) {
      const userAudiences = [];
      const userAudience = new UserAudienceEntity();
      userAudience.entityId = user.id;
      userAudience.entityType = 'USER';
      userAudience.audienceId = -1;
      userAudience.createdBy = user.id;
      userAudience.modifiedBy = user.id;
      userAudiences.push(userAudience);
      await this.saveAllUserAudiences(userAudiences);
    }
  }

  async getAllAudience(page: number, limit: number) {
    const [audiences, total] = await this.audienceRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });
    const totalPages = Math.ceil(total / limit);
    return {
      data: audiences,
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages: Number(totalPages),
    };
  }

  async createAudience(audienceDto: AudienceDto, userId: string) {
    const audience = new AudienceEntity();
    audience.name = audienceDto.name;
    audience.validTill = audienceDto.validTill;
    audience.createdAt = new Date();
    audience.createdBy = userId;
    audience.modifiedAt = new Date();
    audience.modifiedBy = userId;
    return await this.saveAudience(audience);
  }

  async updateAudience(audienceDto: AudienceDto, userId: string) {
    const audience = await this.audienceRepository.findOneBy({
      id: audienceDto.id,
    });
    audience.name = audienceDto.name;
    audience.modifiedAt = new Date();
    audience.modifiedBy = userId;
    audience.validTill = audienceDto.validTill;
    audience.active = audienceDto.active;
    return await this.saveAudience(audience);
  }

  async saveAudience(audience: AudienceEntity) {
    return await this.audienceRepository.save(audience);
  }

  private async deactivateExistingUserAudience(
    id: number,
    updatedById: string,
  ) {
    await this.userAudienceRepository
      .createQueryBuilder()
      .update()
      .set({ active: 0, modifiedBy: updatedById, modifiedAt: new Date() })
      .where('audience_id = :id', { id })
      .execute();
  }

  async markOrderAsVip(user: UserEntity) {
    try {
      const payload = {
        vipOrderNum: user.userPreferences.vipOrderNum,
        customerId: user.id,
      };
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          baseURL: this.configService.get<string>('util_url'),
          url: '/orders/mark-vip',
          headers: {
            Authorization: this.configService.get<string>('util_token'),
            'content-type': 'application/json',
          },
          data: payload,
        }),
      );
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while marking order as VIP ',
        e,
      );
      throw new HttpException(
        { message: 'Something went wrong while marking order as VIP.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createSocietyAudienceMapping(
    societyAudienceDto: SocietyAudienceDto,
    adminId: string,
  ) {
    const societyAudienceMappingList = await this.getSocietyAudienceMapping();

    const audience = await this.getValidAudienceByIds([
      societyAudienceDto.audienceId,
    ]);
    if (audience == null || audience.length == 0) {
      throw new HttpException(
        { message: 'Audience not found or expired' },
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const societyAudienceMapping of societyAudienceMappingList) {
      if (
        societyAudienceMapping.societyId === societyAudienceDto.societyId &&
        societyAudienceMapping.audienceId === societyAudienceDto.audienceId
      ) {
        throw new HttpException(
          { message: 'Mapping already exists' },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    societyAudienceMappingList.push(societyAudienceDto);
    await this.fetchAddressesAndCreateUserAudienceMapping(
      societyAudienceDto,
      adminId,
    );
    await this.paramsService.saveParam(
      'SOCIETY_AUDIENCE_MAPPING',
      JSON.stringify(societyAudienceMappingList),
    );
    return societyAudienceMappingList;
  }

  private async fetchAddressesAndCreateUserAudienceMapping(
    societyAudienceDto: SocietyAudienceDto,
    adminId: string,
  ) {
    const userAddresses =
      await this.userAddressService.getUserAddressBySocietyId(
        societyAudienceDto.societyId,
        null,
      );
    const userAudienceEntities = [];
    userAddresses.forEach((userAddress) => {
      const userAudience = UserAudienceEntity.createUserAudienceEntity(
        userAddress.user_id,
        societyAudienceDto.audienceId,
        adminId,
        'USER',
      );
      userAudienceEntities.push(userAudience);
    });
    this.saveAllUserAudiences(userAudienceEntities);
  }

  async removeSocietyAudienceMapping(
    societyAudienceDto: SocietyAudienceDto,
    adminId: string,
  ) {
    const societyAudienceMappingList = await this.getSocietyAudienceMapping();
    if (
      societyAudienceMappingList == null ||
      societyAudienceMappingList.length == 0
    ) {
      return;
    }
    const userAddresses =
      await this.userAddressService.getUserAddressBySocietyId(
        societyAudienceDto.societyId,
        null,
      );
    this.deactivateUserAudiences(
      userAddresses.map((userAddress) => userAddress.user_id),
      [societyAudienceDto.audienceId],
      adminId,
    );
    const newSocietyAudienceMappingList = societyAudienceMappingList.filter(
      (societyAudienceMapping) =>
        societyAudienceMapping.societyId !== societyAudienceDto.societyId ||
        societyAudienceMapping.audienceId !== societyAudienceDto.audienceId,
    );
    this.paramsService.saveParam(
      'SOCIETY_AUDIENCE_MAPPING',
      JSON.stringify(newSocietyAudienceMappingList),
    );
    return newSocietyAudienceMappingList;
  }

  async getSocietyAudienceMapping() {
    return (await this.paramsService.getJsonParamValue(
      'SOCIETY_AUDIENCE_MAPPING',
      null,
    )) as SocietyAudienceDto[];
  }

  async updateSocietyUserAudience(
    user_id: string,
    newSocietyId: number,
    previousSocietyId: number,
  ) {
    const societyAudienceMappingList = await this.getSocietyAudienceMapping();
    if (
      societyAudienceMappingList == null ||
      societyAudienceMappingList.length == 0
    ) {
      return;
    }

    const previousSocietyAudienceMappings = [];
    const newSocietyAudienceMappings = [];
    for (const societyAudienceMapping of societyAudienceMappingList) {
      if (societyAudienceMapping.societyId === previousSocietyId) {
        previousSocietyAudienceMappings.push(societyAudienceMapping);
      }
      if (societyAudienceMapping.societyId === newSocietyId) {
        newSocietyAudienceMappings.push(societyAudienceMapping);
      }
    }

    if (previousSocietyId) {
      this.deactivateUserAudiences(
        [user_id],
        previousSocietyAudienceMappings.map(
          (societyAudienceMapping) => societyAudienceMapping.audienceId,
        ),
        user_id,
      );
    }

    const audiences = await this.getValidAudienceByIds(
      newSocietyAudienceMappings.map(
        (societyAudienceMapping) => societyAudienceMapping.audienceId,
      ),
    );
    if (audiences == null || audiences.length == 0) {
      return;
    }

    const userAudiences = [];
    for (const audience of audiences) {
      const userAudience = UserAudienceEntity.createUserAudienceEntity(
        user_id,
        audience.id,
        user_id,
        'USER',
      );
      userAudiences.push(userAudience);
    }
    this.saveAllUserAudiences(userAudiences);
  }

  deactivateUserAudiences(
    userId: string[],
    audienceIds: number[],
    modifiedBy: string,
  ) {
    return this.userAudienceRepository
      .createQueryBuilder()
      .update()
      .set({ active: 0, modifiedBy: modifiedBy, modifiedAt: new Date() })
      .where('entityId IN (:...userId)', { userId })
      .andWhere('entityType = :entityType', { entityType: 'USER' })
      .andWhere('audience_id IN (:...audienceIds)', { audienceIds })
      .execute();
  }

  async filterFraudAndDuplicateUsers() {
    const keywords = await this.paramsService.getStringParamValue(
      'FRAUD_DETECTION_KEYWORDS',
      '',
    );
    let duplicateFlag = await this.paramsService.getNumberParamValue(
      'TRIGGER_DUPLICATE_DETECTION_IN_CRON',
      1,
    );
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const users = await this.userRepository.find({
      where: {
        is_deleted: false,
        is_blocked: false,
        is_active: true,
        is_verified: true,
        created_at: MoreThanOrEqual(oneDayAgo),
      },
    });
    let userMap = new Map(users.map((user) => [user.id, user]));
    let userAddresses = await this.userAddressService.getUserAddressByUserIds(
      Array.from(userMap.keys()),
    );
    let userAddressMap = new Map(
      userAddresses.map((address) => [address.user_id, address]),
    );
    let keywordsSet = new Set(
      keywords.split(',').map((keyword) => keyword.trim().toLowerCase()),
    );
    for (const [userId, activeAddress] of userAddressMap) {
      const user = userMap.get(userId);
      if (!user.meta_data) {
        user.meta_data = new UserMetadataDto();
      }
      if (
        user.meta_data.isCheckedForFraudAndDuplicacy == null ||
        !user.meta_data.isCheckedForFraudAndDuplicacy
      ) {
        if (duplicateFlag == 1) {
          await this.setDuplicateParent(user, activeAddress);
        }
        await this.checkForFraud(user, activeAddress, keywordsSet);
        user.meta_data.isCheckedForFraudAndDuplicacy = true;
        userMap.set(userId, user);
      }
    }
    await this.saveUsers([...userMap.values()]);
  }

  async checkForFraud(
    user: UserEntity,
    activeAddress: UserAddressEntity,
    keywordsSet: Set<string>,
  ) {
    const userId = user.id;
    const didRechargeWallet = await this.didRechargeWallet(userId);
    if (!didRechargeWallet) {
      const tower = activeAddress.tower.trim().toLowerCase();
      const addressWords = [
        ...activeAddress.address_line_1.trim().split(','),
        ...activeAddress.address_line_2.trim().split(','),
      ].flatMap((word) => word.trim().toLowerCase());
      if (
        keywordsSet.has(tower) ||
        addressWords.some((word) => keywordsSet.has(word))
      ) {
        user.meta_data.isSuspectForFraud = true;
      }
    }
  }

  async setDuplicateParent(user: UserEntity, activeAddress: UserAddressEntity) {
    const result = await this.userAddressService.getParentUserForDuplicateUsers(
      user,
      activeAddress,
    );
    const parentUser = result ? DuplicateUserDto.fromJson(result) : null;
    if (!user.meta_data) {
      user.meta_data = new UserMetadataDto();
    }
    if (parentUser) {
      const parentOrderCount = parentUser.orderCount || 0;
      const currentOrderCount = user.userPreferences.orderCount || 0;
      if (parentOrderCount > currentOrderCount) {
        user.meta_data.isDuplicateUser = true;
        user.meta_data.parentUserId = parentUser.userId;
      } else if (
        parentOrderCount === currentOrderCount &&
        parentUser.creationTime < user.created_at
      ) {
        user.meta_data.isDuplicateUser = true;
        user.meta_data.parentUserId = parentUser.userId;
      } else {
        user.meta_data.isDuplicateUser = false;
      }
    } else {
      user.meta_data.isDuplicateUser = false;
    }
  }

  async didRechargeWallet(userId: string) {
    let pageNo = 1;
    let allStatements = [];
    let totalPages = 1;

    while (pageNo <= totalPages) {
      let result = await this.commonService.getWalletStatement(userId, pageNo);
      let statement: [] = result['data'];
      totalPages = result['pages'];
      allStatements = allStatements.concat(statement);
      pageNo++;
    }
    if (allStatements.length > 0) {
      return allStatements.some(
        (s) => s['txnType'] === 'Payment-PG' || s['txnType'] === 'Payment_CC',
      );
    }
    return false;
  }

  async markFirstOrderFlowViewed(userIds: string[], adminId: string) {
    const users = await this.getActiveUserFromIds(userIds);
    for (const user of users) {
      if (!user.meta_data) {
        user.meta_data = new UserMetadataDto();
      }
      user.meta_data.isFirstOrderFlow = false;
      user.updated_by = adminId;
      user.updated_at = new Date();
    }
    this.saveUsers(users);
  }
}
