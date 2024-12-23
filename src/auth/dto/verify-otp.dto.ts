import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'phone number of the user',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Incorrect phone number format',
  })
  phone_number: string;

  @ApiProperty({
    description: 'otp entered by the user',
  })
  @IsNotEmpty()
  @IsString()
  // @Matches(/^\d{4}$/, {
  //   message: 'OTP needs to be 4 digit long, please check again.',
  // })
  otp: string;
}
