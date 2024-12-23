import { ParamsModule } from './user_params/params.module';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtTokenModule } from './core/jwt-token/jwt-token.module';
import { SmsModule } from './core/sms/sms.module';
import { CommonModule } from './core/common/common.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RolesGuard } from './core/guards/roles.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAddressModule } from './user_address/user_address.module';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { LoggingMiddleware } from './core/logging.middleware';
import { UserStoreMappingModule } from './user_store/user-store-mapping.module';
import { PrivilegeHandlerInterceptor } from './core/privilege.interceptor';
import { PrivilegeService } from './privilege/privilege.service';
import { PrivilegeEndpointsEntity } from './privilege/entity/privilege-endpoints.entity';
import { AsyncContextModule } from '@nestjs-steroids/async-context';
import { UserManagerMappingModule } from './user_manager/user-manager-mapping.module';
import { UserOffersModule } from './user_offers/user-offers.module';
import { SocietyModule } from './society/society.module';
import { UserEventsModule } from './user_events/user.events.module';

require('newrelic');

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validate,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        logging: false,
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuthModule,
    JwtTokenModule,
    SmsModule,
    CommonModule,
    UserAddressModule,
    UserStoreMappingModule,
    ParamsModule,
    UserOffersModule,
    TypeOrmModule.forFeature([PrivilegeEndpointsEntity]),
    AsyncContextModule.forRoot(),
    UserManagerMappingModule,
    SocietyModule,
    UserEventsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    LoggingMiddleware,
    PrivilegeService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PrivilegeHandlerInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
