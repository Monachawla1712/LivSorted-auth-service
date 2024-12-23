import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetUsersDto {
  @ApiProperty()
  @IsString({ each: true })
  ids!: string[];
}
