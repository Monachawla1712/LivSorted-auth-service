import { ErrorBean } from '../../core/common/dto/error.bean';

export class VipUserUploadBean {
    phoneNumber: string;
    vipOrdersCount: number;
    errors: ErrorBean[] = [];

    static getHeaderMapping() {
        return 'phoneNumber:Phone Number,vipOrdersCount:Count';
    }
}
