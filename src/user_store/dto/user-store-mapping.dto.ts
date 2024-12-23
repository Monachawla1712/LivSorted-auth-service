import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UserStoreMappingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  store_id: string;

  @ApiPropertyOptional()
  @IsBoolean()
  is_active: boolean;
}
