import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UserEventRequestDto {
  @IsString()
  @IsOptional()
  skuCode: string;

  @IsString()
  @IsOptional()
  eventTime: string;

  @IsBoolean()
  @IsOptional()
  isNotificationPermissionGranted: boolean;

  @IsString()
  userId: string;
}
