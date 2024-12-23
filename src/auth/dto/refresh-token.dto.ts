import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'refresh token assigned to the user',
  })
  @IsOptional()
  @IsString()
  refresh_token: string;
}
