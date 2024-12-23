import { Module } from '@nestjs/common';
import { CommonService } from '../core/common/common.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStoreMappingService } from './user-store-mapping.service';
import { UserStoreMappingEntity } from './user-store-mapping.entity';
import { UserStoreMappingController } from './user-store-mapping.controller';
import { BulkUploadEntity } from '../core/common/bulk-upload.entity';
import { UserService } from '../user/user.service';
import { JwtTokenService } from '../core/jwt-token/jwt-token.service';
import { UserEntity } from '../user/user.entity';
import { RefreshTokenEntity } from '../auth/refresh-token.entity';
import { DevicesEntity } from '../user/devices.entity';
import { UserAppsEntity } from '../user/user-apps.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ParamsService } from '../user_params/params.service';
import { ParamsEntity } from '../user_params/params.entity';
import { AmStoreMappingService } from './am-store-mapping.service';
import { AmStoreMappingEntity } from './am-store-mapping.entity';
import { HttpModule } from '@nestjs/axios';
import { UserManagerMappingEntity } from '../user_manager/user-manager-mapping.entity';
import { UserManagerMappingService } from '../user_manager/user-manager-mapping.service';
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
    TypeOrmModule.forFeature([
      UserStoreMappingEntity,
      BulkUploadEntity,
      UserEntity,
      RefreshTokenEntity,
      DevicesEntity,
      UserAppsEntity,
      ParamsEntity,
      AmStoreMappingEntity,
      UserManagerMappingEntity,
      SocietyEntity,
      UserAudienceEntity,
      AudienceEntity,
      UserAddressEntity,
      SocietyRequestEntity,
      UserEventEntity,
    ]),
    HttpModule,
  ],
  providers: [
    UserStoreMappingService,
    CommonService,
    UserService,
    JwtTokenService,
    JwtService,
    ConfigService,
    ParamsService,
    AmStoreMappingService,
    UserManagerMappingService,
    UserAddressService,
    AwsService,
    AwsConfig,
    RestApiService,
    UserEventsService,
  ],
  controllers: [UserStoreMappingController],
})
export class UserStoreMappingModule {}
