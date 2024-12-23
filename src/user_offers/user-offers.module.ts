import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EligibleOffersEntity } from './user-eligible-offers.entity';
import { UserService } from 'src/user/user.service';
import { UserOffersController } from './user-offers.controller';
import { JwtTokenService } from 'src/core/jwt-token/jwt-token.service';
import { UserEntity } from 'src/user/user.entity';
import { RefreshTokenEntity } from 'src/auth/refresh-token.entity';
import { DevicesEntity } from 'src/user/devices.entity';
import { UserAppsEntity } from 'src/user/user-apps.entity';
import { CommonService } from 'src/core/common/common.service';
import { ConfigService } from '@nestjs/config';
import { BulkUploadEntity } from 'src/core/common/bulk-upload.entity';
import { UserOffersService } from './user-offers.service';
import { ParamsService } from '../user_params/params.service';
import { ParamsEntity } from '../user_params/params.entity';
import { SocietyEntity } from '../society/entity/society.entity';
import { UserAddressService } from '../user_address/user_address.service';
import { SocietyRequestEntity } from '../user_address/society_request.entity';
import { UserAudienceEntity } from '../user/user-audience.entity';
import { AudienceEntity } from '../user/audience.entity';
import { UserAddressEntity } from '../user_address/user_address.entity';
import { OnboardingOfferEntity } from './onbaording-offer.entity';
import { RestApiService } from 'src/core/rest-api-service';
import { AwsConfig } from '../config/aws.config';
import { AwsService } from '../core/common/aws.service';
import { UserEventsService } from '../user_events/user.events.service';
import { UserEventEntity } from '../user_events/entity/user.event.entity';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      EligibleOffersEntity,
      UserEntity,
      RefreshTokenEntity,
      DevicesEntity,
      UserAppsEntity,
      BulkUploadEntity,
      ParamsEntity,
      SocietyEntity,
      UserAudienceEntity,
      AudienceEntity,
      UserAddressEntity,
      SocietyRequestEntity,
      OnboardingOfferEntity,
      UserAddressEntity,
      SocietyRequestEntity,
      UserEventEntity,
    ]),
    HttpModule,
  ],
  providers: [
    UserService,
    JwtTokenService,
    CommonService,
    ConfigService,
    UserOffersService,
    ParamsService,
    UserAddressService,
    AwsConfig,
    AwsService,
    RestApiService,
    UserEventsService,
  ],
  controllers: [UserOffersController],
})
export class UserOffersModule {}
