import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserBlockedDto {
  @ApiProperty()
  @IsBoolean()
  is_blocked: boolean;
}
