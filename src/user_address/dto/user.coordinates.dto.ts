import { IsNotEmpty, IsNumber } from 'class-validator';

export class UserCoordinatesDto {
  @IsNumber()
  @IsNotEmpty()
  societyId: number;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}
