import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UserAppListDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppDto)
  appList: AppDto[];
}
export class AppDto {
  @IsNotEmpty()
  deviceId: string;
  @IsNotEmpty()
  packageName: string;
  @IsNotEmpty()
  platformName: string;
  @IsNotEmpty()
  appName: string;
}
