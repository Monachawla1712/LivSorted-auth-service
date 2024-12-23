import { EligibleOffersSkusDto } from './eligible-offers-skus.dto';

export class UploadUserOffersRequestDto {
  skuQtyMap: EligibleOffersSkusDto[];
  terms: string[];
  expiryDays: number;
  offerName: string;
}
