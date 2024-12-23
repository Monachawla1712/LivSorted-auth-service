import { AsyncContext } from '@nestjs-steroids/async-context';
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from '../config/configuration';
import { CommonService } from '../core/common/common.service';
import { CustomLogger } from '../core/custom-logger';
import { JwtTokenService } from '../core/jwt-token/jwt-token.service';
import { EligibleOffersEntity } from './user-eligible-offers.entity';
import { EligibleOffersCreateDto } from './dto/eligible-offers-create.dto';
import { UserService } from 'src/user/user.service';
import { ParamsService } from '../user_params/params.service';
import { UserOffersUploadBean } from './dto/user-offers-upload.bean';
import { ErrorBean } from '../core/common/dto/error.bean';
import { ParseResult } from '../core/common/dto/parse-result.bean';
import { UploadUserOffersRequestDto } from './dto/upload-user-offers-req.dto';
import { firstValueFrom } from 'rxjs';
import { EligibleOffers } from 'src/user/dto/eligible-offers.dto';
import { UserMetadataDto } from 'src/user/dto/user-metadata.dto';
import { UserPreferences } from 'src/user/dto/user-pref.dto';
import { UserAddressService } from "../user_address/user_address.service";
import { addDays } from "date-fns";
import { OnboardingOfferEntity } from "./onbaording-offer.entity";
import { OfferTypeEnum } from "./enum/offer-type.enum";

@Injectable()
export class UserOffersService {
  private readonly logger = new CustomLogger(UserOffersService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private jwtTokenService: JwtTokenService,
    @InjectRepository(EligibleOffersEntity)
    private readonly eligibleOffersRepository: Repository<EligibleOffersEntity>,
    @InjectRepository(OnboardingOfferEntity)
    private readonly onboardingOfferRepository: Repository<OnboardingOfferEntity>,
    private commonService: CommonService,
    private userService: UserService,
    private httpService: HttpService,
    private paramsService: ParamsService,
    private userAddressService: UserAddressService,
    private configService: ConfigService<Config, true>,
  ) {}

  async createOffers(userId: string, dto: EligibleOffersCreateDto) {
    const response = new EligibleOffersEntity();
    response.created_by = userId;
    response.offer_name = dto.offer_name;
    response.society_id = dto.society_id;
    response.skus = dto.skus;
    response.metadata = dto.metadata;
    response.offer_start = new Date(dto.offer_start);

    await this.eligibleOffersRepository.save(response);
  }

  async getUserEligibleOffersBySocietyId(society_id: number, user_id: string) {
    let eligibleOffer = await this.eligibleOffersRepository.findOne({
      where: { society_id, active: true },
    });
    if (!eligibleOffer) {
      eligibleOffer = await this.eligibleOffersRepository.findOne({
        where: { society_id: -1, active: true },
      });
    }
    const response = await this.userService.updateUserEligibleOffers(
      user_id,
      eligibleOffer,
    );
    return response?.eligible_offers;
  }

  async updateUserEligibleOffers(
    userOffersUploadBean: UserOffersUploadBean[],
    uploadUserOffersRequestDto: UploadUserOffersRequestDto,
  ) {
    const users = await this.userService.getActiveUserFromIds(
      userOffersUploadBean.map((userOffers) => {
        return userOffers.userId;
      }),
    );
    const eligibleOffers = await this.buildUserEligibleOfferResponse(
      uploadUserOffersRequestDto,
    );
    for (const user of users) {
      user.eligible_offers = eligibleOffers;
    }
    await this.userService.saveUsers(users);
  }

  async buildUserEligibleOfferResponse(request: UploadUserOffersRequestDto) {
    const response: EligibleOffers = new EligibleOffers();

    const expiryDate = new Date(
      new Date().setDate(new Date().getDate() + Number(request.expiryDays) - 1),
    );
    expiryDate.setHours(23, 50, 0, 0);

    const productDetails = await this.fetchProductFromSku(
      request.skuQtyMap[0].skuCode,
    );

    response.skus = request.skuQtyMap;
    response.terms = request.terms;
    response.expiry = expiryDate;
    response.offerName = request.offerName;
    response.imageUrl = `https://d104zhxgqc96gb.cloudfront.net/public/${productDetails[0].image_url}`;
    response.treeGame = false;
    response.freeTomatoes = true;
    return response;
  }

  async applyVoucherOffer(userId: string, signupCode: string, societyId: number, appVersion: string) {
    const voucherVersion = await this.paramsService.getStringParamValue('FIRST_ORDER_FLOW_VERSION', '1.1.100');
    const isVersionGreater = this.commonService.isVersionGreaterOrEqual(appVersion, voucherVersion);

    const user = await this.userService.getActiveUserById(userId);
    const currentIstDate = this.commonService.getCurrentIstDateWithoutTime();
    const onboardingOffer = await this.onboardingOfferRepository
      .createQueryBuilder('offer')
      .where('LOWER(offer.signup_code) = LOWER(:signupCode) AND offer.is_active = true AND offer.expiry > :currentIstDate', { signupCode, currentIstDate })
      .getOne();
    try {
      if (!onboardingOffer) {
        return {
          success: false,
          message: 'No Signup Code Found',
        };
      }

      if (!isVersionGreater && onboardingOffer.offer.offerType !== OfferTypeEnum.ONBOARDING_AMOUNT_OFFER) {
        return {
          success: false,
          message: 'Please update the app to use this signup code',
        };
      }
      //
      // let isEligible = true;
      // if (onboardingOffer.society_ids == null || onboardingOffer.society_ids.length === 0) {
      //   isEligible = true;
      // } else if (societyId != null) {
      //   isEligible = onboardingOffer.society_ids.includes(Number(societyId));
      // } else {
      //   isEligible = true;
      // }
      //
      // if (!isEligible) {
      //   return {
      //     success: false,
      //     message: 'Signup Code not applicable for this society',
      //   }
      // }

      if (user.eligible_offers == null) {
        user.eligible_offers = new EligibleOffers();
      }
      user.eligible_offers.onboardingOffer = onboardingOffer.offer;
      if (user.meta_data == null) {
        user.meta_data = new UserMetadataDto();
      }
      if (user.meta_data.usedVouchersList == null) {
        user.meta_data.usedVouchersList = [];
      }
      user.meta_data.usedVouchersList.push(signupCode);
      if (user.userPreferences == null) {
        user.userPreferences = new UserPreferences();
      }
      user.userPreferences.isVoucherEligible = false;

      user.eligible_offers.onboardingOffer.voucherCode = signupCode.toUpperCase();
      if (onboardingOffer.offer.constraint && onboardingOffer.offer.constraint.offerValidDays) {
        user.eligible_offers.onboardingOffer.offerExpiry = addDays(this.commonService.getCurrentIstDateWithoutTime(), onboardingOffer.offer.constraint.offerValidDays);
      }
      user.eligible_offers.onboardingOffer.isOnboardingOfferValid = true;

      if (user.eligible_offers.onboardingOffer.offerType === OfferTypeEnum.ONBOARDING_AMOUNT_OFFER) {
        await this.commonService.addOrDeductMoneyFromUserWallet(
          userId,
          user.eligible_offers.onboardingOffer.amount,
          `Voucher-${signupCode}`,
          'Welcome-Voucher',
        );
        user.eligible_offers.onboardingOffer.isOnboardingOfferValid = false;
      }
      let dialogMessage = await this.paramsService.getStringParamValue(
        'VOUCHER_DIALOG_MESSAGE',
        'have been added\nto your wallet',
      );
      await this.userService.saveUser(user);
      if (!isVersionGreater) {
        return {
          success: true,
          message: 'Voucher Applied',
          amount: onboardingOffer.offer.amount ? onboardingOffer.offer.amount.toString() + '/-' : '0/-',
          dialogMessage: dialogMessage.replace(/\\n/g, '\n'),
        };
      }
      return user.eligible_offers.onboardingOffer.dialogMessageObj;
} catch (e) {
      throw new HttpException(
        { message: 'Something went wrong while applying signup code.' },
        HttpStatus.INTERNAL_SERVER_ERROR,);
    }
  }

  async validateUsersSheetUpload(userOffersUploadBean: UserOffersUploadBean[]) {
    const uploadOffersParseResults = new ParseResult<UserOffersUploadBean>();
    if (userOffersUploadBean.length == 0) {
      uploadOffersParseResults.failedRows = userOffersUploadBean;
      return uploadOffersParseResults;
    }
    const existingUsers = await this.userService.getActiveUserFromIds(
      userOffersUploadBean.map((userOffers) => {
        return userOffers.userId;
      }),
    );
    const existingUserIds = existingUsers?.map((user) => {
      return user.id;
    });

    for (const user of userOffersUploadBean) {
      if (!existingUserIds.includes(user.userId)) {
        user.errors.push(
          new ErrorBean('FIELD_ERROR', 'User Id not found', 'userId'),
        );
      }
      if (user.errors.length == 0) {
        uploadOffersParseResults.successRows.push(user);
      } else {
        uploadOffersParseResults.failedRows.push(user);
      }
    }
    return uploadOffersParseResults;
  }

  async fetchProductFromSku(sku) {
    try {
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'GET',
          baseURL: this.configService.get<string>('util_url'),
          url: `store-app/internal/products?sku_code=${sku}`,
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
        'Error while fetching product',
        e,
      );
      throw new HttpException(
        { message: 'Something went wrong while fetching product.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async disableOnboardingOffers(userIds: string[], adminId: string) {
    const users = await this.userService.getActiveUserFromIds(userIds);
    for (const user of users) {
      if (user.eligible_offers != null && user.eligible_offers.onboardingOffer != null) {
        user.eligible_offers.onboardingOffer.isOnboardingOfferValid = false;
        user.updated_by = adminId;
        user.updated_at = new Date();
      }
    }
    this.userService.saveUsers(users);
  }
}
