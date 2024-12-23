import { OfferTypeEnum } from "../enum/offer-type.enum";
import { OfferConstraint } from "./offer-constraint.dto";
import { SkuQuantityDto } from "./sku-quantity.dto";
import { DiscountTypeEnum } from "./discount-type.enum";
import { GenericDialogMsgDto } from "./GenericDialogMsg.dto";

export class OnboardingOfferDto {
    voucherCode: string;
    offerType: OfferTypeEnum;
    offerExpiry: Date;
    skus: SkuQuantityDto[];
    constraint: OfferConstraint;
    amount: number;
    discountType: DiscountTypeEnum;
    terms: string[];
    isOnboardingOfferValid: boolean;
    dialogMessageObj: GenericDialogMsgDto;
}