import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class AddUserDto {
  @ApiProperty({
    description: 'phone number of the user',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[6-9]\d{9}$/)
  phone_number: string;

  @ApiProperty({
    description: 'country code of the phone number',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[+]\d{1,2}$/)
  country_code: string;

  @ApiPropertyOptional({
    description: 'name of the user',
  })
  @IsOptional()
  @IsString()
  name: string;
}
