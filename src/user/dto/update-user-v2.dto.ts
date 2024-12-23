import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDtoV2 {
  @ApiProperty({
    description: 'whatsapp opt in',
  })
  @IsOptional()
  @IsBoolean()
  whatsapp_opt_in?: boolean;
}
