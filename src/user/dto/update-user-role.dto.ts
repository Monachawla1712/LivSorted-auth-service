import { IsArray, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enum/user.role';

export class UpdateUserRoleDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}
