import { WarehouseStoreResponseData } from './wh-store-data.response';
import { StoreListResponse } from './stores-list.response';
import { UserEntity } from '../../user/user.entity';
import { RoadmapStatus } from '../../user/enum/roadmap.status';
import { LoginAction } from '../../user/enum/login-action.enum';

export class StoreListDto {
  whData: WarehouseStoreResponseData[];
  isApprovalRequested = false;
  trackingStore: StoreListResponse = null;
  approverDetails: UserEntity = null;
  action: LoginAction = null;
  roadmapStatus: RoadmapStatus = null;
}
