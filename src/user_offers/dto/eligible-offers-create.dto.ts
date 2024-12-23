import { IsNotEmpty, IsNumber, IsObject, IsString } from 'class-validator';
import { EligibleOffersMetadataDto } from './eligible-offers-metadata.dto';
import { EligibleOffersSkusDto } from './eligible-offers-skus.dto';

export class EligibleOffersCreateDto {
  @IsNotEmpty()
  @IsString()
  offer_name: string;

  @IsNotEmpty()
  @IsNumber()
  society_id: number;

  // @IsObject()
  @IsNotEmpty()
  skus: EligibleOffersSkusDto[];

  @IsNotEmpty()
  @IsString()
  offer_start: string;

  @IsNotEmpty()
  @IsObject()
  metadata: EligibleOffersMetadataDto;
}
