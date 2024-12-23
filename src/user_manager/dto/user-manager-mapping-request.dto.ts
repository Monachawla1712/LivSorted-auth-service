import { IsNotEmpty, IsUUID } from 'class-validator';

export class UserManagerMappingRequestDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  managerId: string;
}
