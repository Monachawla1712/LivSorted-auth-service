import { Module } from '@nestjs/common';
import { CommonService } from '../core/common/common.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserManagerMappingController } from './user-manager-mapping.controller';
import { UserService } from '../user/user.service';
import { JwtTokenService } from '../core/jwt-token/jwt-token.service';
import { UserEntity } from '../user/user.entity';
import { RefreshTokenEntity } from '../auth/refresh-token.entity';
import { DevicesEntity } from '../user/devices.entity';
import { UserAppsEntity } from '../user/user-apps.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ParamsEntity } from '../user_params/params.entity';
import { HttpModule } from '@nestjs/axios';
import { UserManagerMappingEntity } from './user-manager-mapping.entity';
import { BulkUploadEntity } from '../core/common/bulk-upload.entity';
import { UserManagerMappingService } from './user-manager-mapping.service';
import { ParamsService } from '../user_params/params.service';
import { SocietyEntity } from '../society/entity/society.entity';
import { UserAddressService } from '../user_address/user_address.service';
import { SocietyRequestEntity } from '../user_address/society_request.entity';
import { UserAudienceEntity } from '../user/user-audience.entity';
import { AudienceEntity } from '../user/audience.entity';
import { UserAddressEntity } from '../user_address/user_address.entity';
import { AwsConfig } from '../config/aws.config';
import { AwsService } from '../core/common/aws.service';
import { RestApiService } from 'src/core/rest-api-service';
import { UserEventsService } from '../user_events/user.events.service';
import { UserEventEntity } from '../user_events/entity/user.event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BulkUploadEntity,
      UserEntity,
      RefreshTokenEntity,
      DevicesEntity,
      UserAppsEntity,
      ParamsEntity,
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
    UserManagerMappingService,
    CommonService,
    UserService,
    JwtTokenService,
    JwtService,
    ConfigService,
    ParamsService,
    UserEventsService,
    UserAddressService,
    AwsConfig,
    AwsService,
    RestApiService,
  ],
  controllers: [UserManagerMappingController],
})
export class UserManagerMappingModule {}
