import { Type } from 'class-transformer';
import { StoreStatus } from '../../user/enum/store.status';

export class WarehouseStoreResponseData {
  id: number;
  extStoreId: number;
  name: string;
  address: string;
  @Type(() => Number)
  active: number;
  storeType: string;
  isSrpStore: number;
  storeCategory: string;
  storeDeliveryType: string;
  assets: string[];
  storeImages: string[];
  storeVideos: string[];
  openTime: string;
  status: StoreStatus;
}
