import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AmStoreMappingRequestDto {
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @IsUUID()
  @IsNotEmpty()
  amUserId: string;

  @IsOptional()
  @IsBoolean()
  onlyInsert: boolean;
}
