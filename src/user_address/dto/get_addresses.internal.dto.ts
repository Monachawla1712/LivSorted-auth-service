import { IsInt } from 'class-validator';

export class FetchInternalUserAddressesDto {
  @IsInt({ each: true })
  addressIds: number[];
}
