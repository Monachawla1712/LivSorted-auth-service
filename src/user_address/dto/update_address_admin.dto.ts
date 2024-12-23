import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAddressAdminDto {
  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  name: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  type: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsNumber()
  lat: number;

  @IsOptional()
  @ApiPropertyOptional()
  @IsNumber()
  long: number;

  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  floor: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  house: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  street: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  society: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  sector: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  city: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  state: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsInt()
  pincode: number;

  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  contact_number: string;
}
