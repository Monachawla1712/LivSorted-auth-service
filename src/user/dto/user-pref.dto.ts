export class UserPreferences {
  orderCount?: number;
  slot?: number;
  paymentMethod?: PaymentMethod = PaymentMethod.DIGITAL;
  paymentCollectionMethod?: PaymentMethod = PaymentMethod.DIGITAL;
  paymentPreference?: PaymentPreference = PaymentPreference.AFTER_DELIVERY;
  isSearchVisible?: boolean;
  isNewOrderFlow?: boolean;
  vipOrderNum?: number;
  isVoucherEligible?: boolean;
  isPrepaidUser?: boolean;
  slotUpdateCount?: number = 0;
}

export enum PaymentMethod {
  CASH = 'Cash',
  DIGITAL = 'Digital/UPI',
}

export enum PaymentPreference {
  BEFORE_DELIVERY = 'Before Delivery',
  AFTER_DELIVERY = 'After Delivery',
  AT_DELIVERY = 'At Delivery',
}
