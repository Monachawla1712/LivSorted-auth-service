import { ErrorBean } from '../../core/common/dto/error.bean';

export class SocietyActivityUploadBean {
  societyId: string;
  circulation: string;
  couponCode: string;
  dateOfExecution: string;
  spend: string;
  typeOfActivity: string;
  errors: ErrorBean[] = [];

  static getHeaderMapping() {
    return 'societyId:Society ID,circulation:Circulation,couponCode:Coupon code,dateOfExecution:Date of execution,spend:Spend,typeOfActivity:Type of activity';
  }
}
