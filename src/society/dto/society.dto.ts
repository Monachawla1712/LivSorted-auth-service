import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { SocietyMetadata, Tower } from '../entity/society.metadata';
export class SocietyDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  latitude: number;

  @IsNumber()
  @IsOptional()
  longitude: number;

  @IsArray()
  @IsOptional()
  tower: Tower[];

  @IsNumber()
  @IsNotEmpty()
  storeId: number;

  @IsString()
  pincode: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsOptional()
  areaPolygon: any;

  @IsOptional()
  metadata: SocietyMetadata;

  @IsBoolean()
  @IsNotEmpty()
  isContactDelivery: boolean;

  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
