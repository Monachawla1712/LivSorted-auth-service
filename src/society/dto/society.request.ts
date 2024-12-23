import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { SocietyMetadata, Tower } from '../entity/society.metadata';

export class SocietyRequest {
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

  @IsString()
  @IsNotEmpty()
  storeId: string;

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

  @IsNumber()
  @IsNotEmpty()
  isContactDelivery: number;

  @IsNumber()
  @IsNotEmpty()
  active: number;
}
