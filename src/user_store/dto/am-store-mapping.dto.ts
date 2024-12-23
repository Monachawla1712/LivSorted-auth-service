import { AmUserDetailsDto } from './am-user-details.dto';

export class AmStoreMappingDto {
  storeId: string = null;
  startDate: Date = null;
  endDate: Date = null;
  amUserId: string = null;
  amUser: AmUserDetailsDto = null;
}
