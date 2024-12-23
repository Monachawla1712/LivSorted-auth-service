import { ErrorBean } from '../../core/common/dto/error.bean';

export class UserAudienceUploadBean {
  phoneNumber: string;
  audienceId: number;
  userId: string;
  validTill: Date;
  include: boolean;
  errors: ErrorBean[] = [];

  static getHeaderMapping() {
    return 'phoneNumber:Phone Number';
  }
}