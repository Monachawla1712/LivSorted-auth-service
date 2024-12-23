import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Column } from 'typeorm';

export class AddUserDeviceDto {
  @ApiProperty({
    description: 'device id of the device logged in from',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: 'mac address of the device logged in from',
  })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiProperty({
    description: 'manufacturer of the device logged in from',
  })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty({
    description: 'model of the device logged in from',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({
    description: 'operating system of the device logged in from',
  })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiProperty({
    description: 'version of the app installed',
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiProperty({
    description: 'notification token for the linked device',
  })
  @IsOptional()
  @IsString()
  notificationToken: string;

  @ApiProperty({
    description: 'serial number of the device',
  })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({
    description: 'advertisement id of the device',
  })
  @IsOptional()
  @IsString()
  advertisementId?: string;
}
