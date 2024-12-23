import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class PosCreateUserDto {
  @ApiProperty({
    description: 'phone number of the user',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/)
  phone_number: string;

  @ApiProperty({
    description: 'name of the user',
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'name of the user',
  })
  @IsOptional()
  @IsNumber()
  pincode: number;

  @ApiProperty({
    description: 'name of the user',
  })
  @IsOptional()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'name of the user',
  })
  @IsOptional()
  @IsString()
  address: string;
}
