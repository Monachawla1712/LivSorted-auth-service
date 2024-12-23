import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { JwtTokenService } from '../core/jwt-token/jwt-token.service';
import { HttpModule } from '@nestjs/axios';
import { SmsService } from '../core/sms/sms.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenEntity } from './refresh-token.entity';
import { OtpTokensEntity } from './otp-tokens.entity';
import { DevicesEntity } from '../user/devices.entity';
import { UserStoreMappingService } from '../user_store/user-store-mapping.service';
import { UserStoreMappingEntity } from '../user_store/user-store-mapping.entity';
import { UserAppsEntity } from '../user/user-apps.entity';
import { RolesEntity } from '../privilege/entity/roles.entity';
import { CommonService } from '../core/common/common.service';
import { BulkUploadEntity } from '../core/common/bulk-upload.entity';
import { ParamsService } from 'src/user_params/params.service';
import { ParamsEntity } from 'src/user_params/params.entity';
import { SocietyEntity } from '../society/entity/society.entity';
import { UserAudienceEntity } from '../user/user-audience.entity';
import { AudienceEntity } from '../user/audience.entity';
import { UserAddressEntity } from '../user_address/user_address.entity';
import { SocietyRequestEntity } from '../user_address/society_request.entity';
import { UserAddressService } from '../user_address/user_address.service';
import { AwsService } from '../core/common/aws.service';
import { AwsConfig } from '../config/aws.config';
import { RestApiService } from 'src/core/rest-api-service';
import { UserEventsService } from '../user_events/user.events.service';
import { UserEventEntity } from '../user_events/entity/user.event.entity';

@Module({
  imports: [
    JwtModule.register({}),
    HttpModule,
    TypeOrmModule.forFeature([
      UserEntity,
      RefreshTokenEntity,
      OtpTokensEntity,
      DevicesEntity,
      UserStoreMappingEntity,
      UserAppsEntity,
      RolesEntity,
      BulkUploadEntity,
      ParamsEntity,
      SocietyEntity,
      UserAudienceEntity,
      AudienceEntity,
      UserAddressEntity,
      SocietyRequestEntity,
      UserEventEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    JwtTokenService,
    SmsService,
    ConfigService,
    UserStoreMappingService,
    CommonService,
    ParamsService,
    AwsService,
    AwsConfig,
    UserAddressService,
    RestApiService,
    UserEventsService,
  ],
})
export class AuthModule {}
