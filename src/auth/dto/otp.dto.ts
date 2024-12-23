import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OtpDto {
  @ApiProperty({
    description: 'country code of the phone number',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[+]\d{1,2}$/)
  country_code: string;

  @ApiProperty({
    description: 'phone number of the user',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[6-9]\d{9}$/)
  phone_number: string;

  @ApiProperty({
    description: 'firebase verification id',
  })
  @IsOptional()
  @IsString()
  verificationId: string;
}
