import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerifyOtpDto } from './dto';
import { OtpDto } from './dto/otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { UserRole } from 'src/user/enum/user.role';
import { UserStoreRegistrationDto } from './dto/register-franchise-store.dto';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config/configuration';
import { SmsService } from '../core/sms/sms.service';
import { JwtTokenService } from '../core/jwt-token/jwt-token.service';
import { RefreshTokenEntity } from './refresh-token.entity';
import { UserStoreMappingService } from '../user_store/user-store-mapping.service';
import { UserStoreMappingEntity } from '../user_store/user-store-mapping.entity';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { RolesEntity } from '../privilege/entity/roles.entity';
import { UserEntity } from '../user/user.entity';

@Controller()
@ApiTags('Auth')
@UseFilters(HttpExceptionFilter)
export class AuthController {
  private readonly logger = new CustomLogger(AuthController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private authService: AuthService,
    private userService: UserService,
    private configService: ConfigService<Config, true>,
    private smsService: SmsService,
    private jwtTokenService: JwtTokenService,
    private userStoreMappingService: UserStoreMappingService,
  ) {}

  @ApiBody({ type: OtpDto })
  @Post(['otp', 'franchise-store/otp'])
  async otp(@Headers('userId') userId, @Body() otpDto: OtpDto) {
    const user = await this.userService.getVerifiedUserFromPhone(
      otpDto.phone_number,
    );
    await this.authService.checkIfUserIsBlocked(user);
    const otpUserId = user != null && user.id != null ? user.id : userId;
    if (otpDto.verificationId) {
      await this.authService.saveFirebaseVerificationId(otpUserId, otpDto);
    } else {
      await this.authService.generateAndSendOtp(otpUserId, otpDto);
    }
    return {
      name: user == null ? null : user.name,
      greeting: user != null ? user.greeting : null,
      greetingSuffix: user != null ? user.greeting_suffix : null,
      isNewUser:
        user == null ||
        user.userPreferences == null ||
        (user.userPreferences.isVoucherEligible == null &&
          (user.userPreferences.orderCount == null ||
            user.userPreferences.orderCount === 0)) ||
        (user.userPreferences.isVoucherEligible != null &&
          user.userPreferences.isVoucherEligible &&
          (user.userPreferences.orderCount == null ||
            user.userPreferences.orderCount === 0)),
      success: true,
      message: 'otp sent successfully',
    };
  }

  @ApiBody({ type: VerifyOtpDto })
  @Post('verify-otp')
  async verifyOtp(
      @Headers("appVersion") appVersion,
      @Body() verifyOtpDto: VerifyOtpDto
  ) {
    const verificationToken =
      await this.authService.getLastActiveVerificationId(
        verifyOtpDto.phone_number,
      );
    if (
      verificationToken != null &&
      verificationToken.verification_id != null
    ) {
      return await this.authService.validateFirebaseOTP(
        verificationToken,
        verifyOtpDto,
      );
    } else {
      const otpToken = await this.authService.getLastActiveOtp(
        verifyOtpDto.phone_number,
      );
      await this.authService.validateOTP(otpToken, verifyOtpDto);
      await this.authService.softDeleteOtp(otpToken);
      const user = await this.userService.getOrCreateUserFromPhoneAndRole(
        verifyOtpDto.phone_number,
        UserRole.CONSUMER,
        otpToken.user_id,
        appVersion,
      );
      await this.authService.checkIfUserIsBlocked(user);
      const resp = await this.getUserToken(user);
      return resp;
    }
  }

  @Get('unverified/user/:id')
  async verifyUser(@Param('id') id: string) {
    const user = await this.userService.getActiveUserById(id);
    if (user == null) {
      throw new HttpException(
        { message: 'No user found' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const resp = await this.getUserToken(user);
    return resp;
  }

  private async getUserToken(user: UserEntity) {
    const tokens = await this.jwtTokenService.getTokensNew({
      userId: user.id,
      roles: user.roles,
    });
    await this.createRefreshTokenEntry(tokens.refresh_token, user.id);
    return { ...tokens, user };
  }

  @ApiBody({ type: OtpDto })
  @Post('admin/otp')
  async otpAdmin(@Body() otpDto: OtpDto) {
    const user = await this.userService.getUserFromPhoneAndCheckRoles(
      otpDto.phone_number,
      [
        UserRole.ADMIN,
        UserRole.ACCOUNTMANAGEMENT,
        UserRole.FINANCE,
        UserRole.ITADMIN,
        UserRole.MARKETING,
        UserRole.WAREHOUSEOPS,
        UserRole.SECODARYDILUTION,
        UserRole.CCEXECUTIVE,
        UserRole.CCMANAGER,
      ],
    );
    await this.authService.generateAndSendOtp(user.id, otpDto);
    return {
      name: user.name,
      isNewUser: false,
      success: true,
      message: 'otp sent successfully',
    };
  }

  @ApiBody({ type: VerifyOtpDto })
  @Post('admin/verify-otp')
  async verifyOtpAdmin(@Body() verifyOtpDto: VerifyOtpDto) {
    const otpToken = await this.authService.getLastActiveOtp(
      verifyOtpDto.phone_number,
    );
    await this.authService.validateOTP(otpToken, verifyOtpDto);
    await this.authService.softDeleteOtp(otpToken);
    const user = await this.userService.getUserFromPhoneAndCheckRoles(
      verifyOtpDto.phone_number,
      [
        UserRole.ADMIN,
        UserRole.ACCOUNTMANAGEMENT,
        UserRole.FINANCE,
        UserRole.ITADMIN,
        UserRole.MARKETING,
        UserRole.WAREHOUSEOPS,
        UserRole.SECODARYDILUTION,
        UserRole.CCEXECUTIVE,
        UserRole.CCMANAGER,
      ],
    );
    const tokens = await this.jwtTokenService.getTokensNew({
      userId: user.id,
      roles: user.roles,
    });
    await this.createRefreshTokenEntry(tokens.refresh_token, user.id);
    return { ...tokens, user };
  }

  @ApiBody({ type: RefreshTokenDto })
  @Post('refresh')
  async token(@Body() refreshToken: RefreshTokenDto) {
    const a = await this.authService.useRefreshToken(refreshToken);
    return a;
  }

  @ApiBody({ type: LogoutDto })
  @Post('logout')
  async logout(@Headers('userId') userId, @Body() logoutDto: LogoutDto) {
    await this.authService.logout(userId, logoutDto);
    return {
      success: true,
      message: 'logged out successfully',
    };
  }

  @ApiBody({ type: UserStoreRegistrationDto })
  @Post('franchise-store/register')
  @HttpCode(HttpStatus.CREATED)
  registerFranchiseStore(
    @Headers('userId') userId,
    @Body() registerFranchiseStoreDto: UserStoreRegistrationDto,
  ) {
    const m = this.authService.registerFranchiseStore(
      userId,
      registerFranchiseStoreDto,
    );
    return m;
  }

  @ApiBody({ type: VerifyOtpDto })
  @Post('franchise-store/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtpFranchiseStore(
    @Headers('userId') userId,
    @Body() verifyOtpDto: VerifyOtpDto,
  ) {
    const otpToken = await this.authService.getLastActiveOtp(
      verifyOtpDto.phone_number,
    );
    await this.authService.validateOTP(otpToken, verifyOtpDto);
    await this.authService.softDeleteOtp(otpToken);
    const user: UserEntity = await this.checkRolesAndCreateUser(
      otpToken.user_id,
      verifyOtpDto.phone_number,
    );
    const tokens = await this.jwtTokenService.getTokensNew({
      userId: user.id,
      roles: user.roles,
    });
    await this.createRefreshTokenEntry(tokens.refresh_token, user.id);
    const isOwner = await this.checkUserOwnerRoles(user);
    return { ...tokens, user, isOwner: isOwner };
  }

  // todo: deprecated API, not in use
  @Get('franchise-store/list')
  @HttpCode(HttpStatus.OK)
  getFranchiseStores(@Headers('userId') userId) {
    const m = this.authService.getStores(userId);
    return m;
  }

  @Get('franchise-store/list/v2')
  @HttpCode(HttpStatus.OK)
  async getFranchiseStoresV2(@Headers('userId') userId) {
    const user = await this.userService.getUserFromId(userId);
    if (user == null) {
      throw new HttpException(
        { message: 'User not found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return this.authService.getStoresV2(userId);
  }

  @Get('franchise-store/list/v2/internal')
  @HttpCode(HttpStatus.OK)
  async getFranchiseStoresIntenal(@Query('userId') userId) {
    const user = await this.userService.getUserFromId(userId);
    if (user == null) {
      throw new HttpException(
        { message: 'User not found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return this.authService.getMappedStoresInternal(userId);
  }

  @ApiBody({ type: OtpDto })
  @Post('fos/otp')
  async otpFosUser(
    @Headers('appId') appId: string,
    @Headers('userId') userId,
    @Body() otpDto: OtpDto,
  ) {
    if (appId == null) {
      throw new HttpException(
        {
          message:
            'Login disabled for old versions. Please Update to the latest version.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const user = await this.userService.getUserFromPhoneAndCheckRoles(
      otpDto.phone_number,
      [
        UserRole.ADMIN,
        UserRole.FOSUSER,
        UserRole.ACCOUNTMANAGEMENT,
        UserRole.FOSRIDER,
      ],
    );
    await this.authService.generateAndSendOtp(userId, otpDto);
    return {
      name: user.name,
      isNewUser: false,
      success: true,
      message: 'otp sent successfully',
    };
  }

  @ApiBody({ type: VerifyOtpDto })
  @Post('fos/verify-otp')
  verifyOtpFosUser(
    @Headers('appId') appId: string,
    @Body() verifyOtpDto: VerifyOtpDto,
  ) {
    if (appId == null) {
      throw new HttpException(
        {
          message:
            'Login disabled for old versions. Please Update to the latest version.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const aa = this.authService.verifyOtpFos(verifyOtpDto);
    return aa;
  }

  @ApiBody({ type: OtpDto })
  @Post('pos/otp')
  async otpStoreManager(@Headers('userId') userId, @Body() otpDto: OtpDto) {
    const user = await this.userService.getUserFromPhoneAndCheckRoles(
      otpDto.phone_number,
      [UserRole.STOREMANAGER],
    );
    const storeMappings = await this.userStoreMappingService.findByUserId(
      user.id,
    );
    this.userStoreNotMapped(storeMappings);
    await this.authService.generateAndSendOtp(user.id, otpDto);
    return {
      name: user.name,
      isNewUser: false,
      success: true,
      message: 'otp sent successfully',
    };
  }

  @ApiBody({ type: VerifyOtpDto })
  @Post('pos/verify-otp')
  async verifyOtpStoreManager(@Body() verifyOtpDto: VerifyOtpDto) {
    const otpToken = await this.authService.getLastActiveOtp(
      verifyOtpDto.phone_number,
    );
    await this.authService.validateOTP(otpToken, verifyOtpDto);
    await this.authService.softDeleteOtp(otpToken);
    const user = await this.userService.getUserFromPhoneAndCheckRoles(
      verifyOtpDto.phone_number,
      [UserRole.STOREMANAGER],
    );
    const storeMappings = await this.userStoreMappingService.findByUserId(
      user.id,
    );
    this.userStoreNotMapped(storeMappings);
    const tokens = await this.jwtTokenService.getTokensNew({
      userId: user.id,
      roles: user.roles,
    });
    await this.createRefreshTokenEntry(tokens.refresh_token, user.id);
    return { ...tokens, user };
  }

  @ApiBody({ type: UserStoreRegistrationDto })
  @Post('pos/register')
  async registerStoreManager(
    @Body() userStoreRegistrationDto: UserStoreRegistrationDto,
  ) {
    const user = await this.userService.getOrCreateUserFromPhoneAndRole(
      userStoreRegistrationDto.phone_number,
      UserRole.STOREMANAGER,
      null,
      null,
    );
    const userStoreMappings = await this.userStoreMappingService.findByUserId(
      user.id,
    );
    this.userStoreAlreadyMappedCheck(userStoreMappings);
    const userStoreMapping = new UserStoreMappingEntity();
    userStoreMapping.store_id = userStoreRegistrationDto.storeId;
    userStoreMapping.user_id = user.id;
    await this.userStoreMappingService.save(userStoreMapping);
    return user;
  }

  private async createRefreshTokenEntry(token: string, userId: string) {
    const refreshToken = new RefreshTokenEntity();
    refreshToken.token = token;
    refreshToken.user_id = userId;
    await this.authService.saveRefreshToken(refreshToken);
  }

  private userStoreNotMapped(storeMapping: UserStoreMappingEntity[]) {
    if (storeMapping.length === 0) {
      throw new HttpException(
        { message: 'User is not mapped to a store.' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private userStoreAlreadyMappedCheck(storeMapping: UserStoreMappingEntity[]) {
    if (storeMapping.length > 0) {
      throw new HttpException(
        { message: 'User is already mapped to a store.' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('franchise-store/inactivate-session/:id')
  @HttpCode(HttpStatus.OK)
  async inactivateStoreSession(@Param('id') storeId) {
    return await this.authService.inactivateStoreSession(storeId);
  }

  @Post('ims/otp')
  async otpIms(@Headers('userId') userId, @Body() otpDto: OtpDto) {
    const user = await this.userService.getUserFromPhoneAndCheckRoles(
      otpDto.phone_number,
      [UserRole.CCEXECUTIVE, UserRole.CCMANAGER],
    );
    await this.authService.generateAndSendOtp(userId, otpDto);
    return {
      name: user.name,
      isNewUser: false,
      success: true,
      message: 'otp sent successfully',
    };
  }

  @Post('ims/verify-otp')
  async verifyOtpIms(@Body() verifyOtpDto: VerifyOtpDto) {
    const otpToken = await this.authService.getLastActiveOtp(
      verifyOtpDto.phone_number,
    );
    await this.authService.validateOTP(otpToken, verifyOtpDto);
    await this.authService.softDeleteOtp(otpToken);
    const user = await this.userService.getUserFromPhoneAndCheckRoles(
      verifyOtpDto.phone_number,
      [UserRole.CCEXECUTIVE, UserRole.CCMANAGER],
    );
    const tokens = await this.jwtTokenService.getTokensNew({
      userId: user.id,
      roles: user.roles,
    });
    await this.createRefreshTokenEntry(tokens.refresh_token, user.id);
    return { ...tokens, user };
  }

  private async checkUserOwnerRoles(user: UserEntity) {
    const roles: RolesEntity[] = await this.authService.getInternalRoles();
    const rolesSet = new Set<string>(
      roles.map((role) => {
        return role.name;
      }),
    );
    for (const role of user.roles) {
      if (rolesSet.has(role)) {
        return false;
      }
    }
    return true;
  }

  private containsMatchingRoles(roles: UserRole[], rolesSet: Set<UserRole>) {
    for (const role of roles) {
      if (rolesSet.has(role)) {
        return true;
      }
    }
    return false;
  }

  private async checkRolesAndCreateUser(userId: string, phoneNumber: string) {
    let user: UserEntity = await this.userService.getUserFromPhone(phoneNumber);
    let saveUser = false;
    if (user == null) {
      saveUser = true;
      user = new UserEntity();
      user.id = userId;
      user.phone_number = phoneNumber;
      user.roles = [UserRole.VISITOR, UserRole.FRANCHISEOWNER];
      user.is_verified = true;
    } else if (
      !this.containsMatchingRoles(
        user.roles,
        new Set<UserRole>([UserRole.FOSUSER, UserRole.FRANCHISEOWNER]),
      )
    ) {
      user.roles.push(UserRole.FRANCHISEOWNER);
      saveUser = true;
    } else if (user.is_verified == false) {
      user.is_verified = true;
      saveUser = true;
    }
    if (saveUser) {
      user = await this.userService.saveUser(user);
    }
    return user;
  }
}
