import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDtoV2 {
  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  name: string;

  @ApiProperty({ default: 'HOME' })
  @IsString()
  type: string;

  @ApiProperty()
  @IsNumber()
  lat: number;

  @ApiProperty()
  @IsNumber()
  long: number;

  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  floor: string;

  @ApiProperty()
  @IsString()
  house: string;

  @ApiProperty()
  @IsString()
  street: string;

  @ApiProperty()
  @IsString()
  society: string;

  @ApiProperty()
  @IsString()
  sector: string;

  @ApiProperty()
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

  @ApiProperty()
  @IsNumber()
  society_id: number;

  @ApiProperty()
  @IsString()
  tower: string;
}
