import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CommonService } from '../core/common/common.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAddressEntity } from './user_address.entity';
import { UserAddressService } from './user_address.service';
import { UserAddressController } from './user_address.controller';
import { UserAddressInternalController } from './user_address.internal.controller';
import { UserAddressAdminController } from './user_address.admin.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BulkUploadEntity } from '../core/common/bulk-upload.entity';
import { SocietyRequestEntity } from './society_request.entity';
import { SocietyEntity } from '../society/entity/society.entity';
import { UserService } from '../user/user.service';
import { JwtTokenService } from '../core/jwt-token/jwt-token.service';
import { UserEntity } from '../user/user.entity';
import { RefreshTokenEntity } from '../auth/refresh-token.entity';
import { DevicesEntity } from '../user/devices.entity';
import { UserAppsEntity } from '../user/user-apps.entity';
import { UserAudienceEntity } from '../user/user-audience.entity';
import { AudienceEntity } from '../user/audience.entity';
import { ParamsService } from '../user_params/params.service';
import { ParamsEntity } from '../user_params/params.entity';
import { AwsService } from '../core/common/aws.service';
import { AwsConfig } from '../config/aws.config';
import { RestApiService } from 'src/core/rest-api-service';
import { UserEventsService } from '../user_events/user.events.service';
import { UserEventEntity } from '../user_events/entity/user.event.entity';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      UserAddressEntity,
      BulkUploadEntity,
      SocietyRequestEntity,
      SocietyEntity,
      UserEntity,
      RefreshTokenEntity,
      DevicesEntity,
      UserAppsEntity,
      UserAudienceEntity,
      AudienceEntity,
      ParamsEntity,
      UserEventEntity,
    ]),
    HttpModule,
  ],
  providers: [
    UserAddressService,
    CommonService,
    ConfigService,
    UserService,
    JwtTokenService,
    ParamsService,
    AwsService,
    AwsConfig,
    RestApiService,
    UserEventsService,
  ],
  controllers: [
    UserAddressController,
    UserAddressInternalController,
    UserAddressAdminController,
  ],
})
export class UserAddressModule {}
