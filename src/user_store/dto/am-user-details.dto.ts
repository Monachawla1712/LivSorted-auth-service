import { UserDetailsDto } from '../../user/dto/user-details.dto';

export class AmUserDetailsDto extends UserDetailsDto {
  manager?: AmUserDetailsDto = null;
}
