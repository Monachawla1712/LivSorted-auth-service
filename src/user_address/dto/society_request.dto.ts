import { IsString } from 'class-validator';

export class SocietyRequestDto {
  @IsString()
  city: string;

  @IsString()
  society: string;
}
