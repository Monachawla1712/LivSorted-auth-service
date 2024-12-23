import { InternalServerErrorException } from '@nestjs/common';
import { Expose, plainToClass } from 'class-transformer';
import { IsEnum, validateSync, IsNotEmpty } from 'class-validator';

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}

export class EnvironmentVariables {
  @Expose()
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @Expose()
  PORT!: string;

  @IsNotEmpty()
  @Expose()
  DATABASE_URL!: string;

  @Expose()
  CLIENT_AWS_ACCESS_KEY: string;

  @Expose()
  CLIENT_AWS_SECRET_KEY: string;

  @Expose()
  AT_SECRET?: string;

  @Expose()
  RT_SECRET?: string;

  @Expose()
  AT_EXPIRY?: string;

  @Expose()
  RT_EXPIRY?: string;

  @Expose()
  OTP_EXPIRY_IN_MINUTES?: number;

  @Expose()
  OTP_DIGITS?: number;

  @Expose()
  ISS?: string;

  @Expose()
  GUPSHUP_USERID: string;

  @Expose()
  GUPSHUP_PASSWORD: string;

  @Expose()
  GUPSHUP_URL: string;

  @Expose()
  SMS_WHITELIST: string;

  @Expose()
  WAREHOUSE_URL: string;

  @Expose()
  RZ_AUTH_KEY: string;

  @Expose()
  UTIL_URL: string;

  @Expose()
  FIREBASE_API_KEY: string;

  @Expose()
  UTIL_TOKEN: string;

  @Expose()
  DEBUG: string;

  @Expose()
  DEFAULT_TIMEOUT: number;

  @Expose()
  CONSUMER_URL: string;
}

export function validate(config: Record<string, unknown>) {
  const transformedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    excludeExtraneousValues: true,
  });

  const errors = validateSync(transformedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new InternalServerErrorException(errors.toString());
  }

  return transformedConfig;
}
