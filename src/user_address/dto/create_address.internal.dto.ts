import { IsNumber, IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressInternalDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsString()
  user_id: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  long: number;

  @IsOptional()
  @IsString()
  floor: string;

  @IsString()
  house: string;

  @IsString()
  street: string;

  @IsString()
  society: string;

  @IsString()
  sector: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  state: string;

  @IsOptional()
  @IsInt()
  pincode: number;

  @IsOptional()
  @IsString()
  contact_number: string;

  @IsOptional()
  @IsInt()
  society_id: number;

  @IsOptional()
  @IsString()
  tower: string;
}
