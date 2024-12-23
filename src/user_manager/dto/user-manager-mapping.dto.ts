import { UserDetailsDto } from '../../user/dto/user-details.dto';

export class UserManagerMappingDto {
  userId: string = null;
  managerId: string = null;
  user: UserDetailsDto = null;
  manager: UserDetailsDto = null;
  startDate: Date = null;
  endDate: Date = null;
}
