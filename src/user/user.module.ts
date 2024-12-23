import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { JwtTokenService } from '../core/jwt-token/jwt-token.service';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenEntity } from '../auth/refresh-token.entity';
import { OtpTokensEntity } from '../auth/otp-tokens.entity';
import { DevicesEntity } from './devices.entity';
import { InternalUserController } from './user.internal.controller';
import { UserAppsEntity } from './user-apps.entity';
import { UserAppController } from './user-app.controller';
import { UserAddressModule } from '../user_address/user_address.module';
import { UserAddressService } from '../user_address/user_address.service';
import { HttpModule } from '@nestjs/axios';
import { UserStoreMappingService } from '../user_store/user-store-mapping.service';
import { UserStoreMappingEntity } from '../user_store/user-store-mapping.entity';
import { CommonService } from '../core/common/common.service';
import { BulkUploadEntity } from '../core/common/bulk-upload.entity';
import { ParamsService } from '../user_params/params.service';
import { ParamsEntity } from '../user_params/params.entity';
import { UserAddressEntity } from '../user_address/user_address.entity';
import { SocietyRequestEntity } from '../user_address/society_request.entity';
import { SocietyEntity } from '../society/entity/society.entity';
import { RestApiService } from 'src/core/rest-api-service';
import { UserAudienceEntity } from './user-audience.entity';
import { AudienceEntity } from './audience.entity';
import { AwsConfig } from '../config/aws.config';
import { AwsService } from '../core/common/aws.service';
import { UserEventEntity } from '../user_events/entity/user.event.entity';
import { UserEventsService } from '../user_events/user.events.service';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      UserEntity,
      RefreshTokenEntity,
      OtpTokensEntity,
      DevicesEntity,
      UserAppsEntity,
      UserStoreMappingEntity,
      BulkUploadEntity,
      ParamsEntity,
      UserAddressEntity,
      SocietyRequestEntity,
      SocietyEntity,
      UserAudienceEntity,
      AudienceEntity,
      UserEventEntity,
    ]),
    UserAddressModule,
    HttpModule,
  ],
  providers: [
    UserService,
    JwtTokenService,
    ConfigService,
    UserAddressService,
    UserStoreMappingService,
    CommonService,
    ParamsService,
    AwsConfig,
    AwsService,
    RestApiService,
    UserEventsService,
  ],
  controllers: [UserController, InternalUserController, UserAppController],
})
export class UserModule {}
