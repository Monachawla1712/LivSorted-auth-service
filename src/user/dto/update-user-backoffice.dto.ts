import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserGreeting } from '../enum/user.greeting';
import { UserRole } from '../enum/user.role';

export class UpdateUserBackofficeDto {
  @ApiProperty({ type: 'Hi, Hello, Hey, Dear' })
  @IsOptional()
  @IsEnum(UserGreeting, { each: true })
  greeting: UserGreeting;

  @ApiProperty({
    description: 'name of the user',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole, { each: true })
  roles?: string[];
}
