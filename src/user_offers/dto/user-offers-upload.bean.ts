import { ErrorBean } from '../../core/common/dto/error.bean';

export class UserOffersUploadBean {
  userId: string;
  errors: ErrorBean[] = [];

  static getHeaderMapping() {
    return 'userId:User Id';
  }
}
