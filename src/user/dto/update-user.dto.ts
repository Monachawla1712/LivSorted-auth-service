import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserGreeting } from '../enum/user.greeting';

export class UpdateUserDto {
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
  greeting_suffix: string;
}
