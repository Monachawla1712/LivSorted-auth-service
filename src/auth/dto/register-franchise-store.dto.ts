import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserStoreRegistrationDto {
  @ApiProperty({
    description: 'id of the franchise store',
  })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({
    description: 'country code of the phone number',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[+]\d{1,2}$/)
  country_code: string;

  @ApiProperty({
    description: 'phone number of the user',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/)
  phone_number: string;

  @ApiProperty({
    description: 'name of the user',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
