import { EligibleOffersSkusDto } from 'src/user_offers/dto/eligible-offers-skus.dto';
import { OnboardingOfferDto } from "../../user_offers/dto/onboarding-offer.dto";

export class EligibleOffers {
  skus?: EligibleOffersSkusDto[];
  minCartValue?: number;
  terms?: string[];
  imageUrl?: string;
  expiry?: Date;
  treeGame: boolean;
  freeTomatoes: boolean;
  offerName: string;
  onboardingOffer?: OnboardingOfferDto;
}
