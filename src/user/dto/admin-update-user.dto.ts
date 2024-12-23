import { IsArray, IsString, IsUUID } from 'class-validator';

export class AdminUpdateUserDto {
  @IsUUID()
  userId: string;

  @IsArray()
  @IsString({ each: true })
  storeIds?: string[];
}
