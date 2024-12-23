export class UserMetadataDto {
  usedVouchersList?: string[];
  isSuspectForFraud: boolean = false;
  isDuplicateUser: boolean = false;
  isCheckedForFraudAndDuplicacy: boolean = false;
  parentUserId?: string;
  parentUserCreationTime?: Date;
  isFirstOrderFlow: boolean = false;
}
