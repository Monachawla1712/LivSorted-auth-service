import {IsDate, IsInt, IsOptional, IsString} from "class-validator";
import {Type} from "class-transformer";

export class AudienceDto {

    @IsInt()
    @IsOptional()
    id: number;

    @IsString()
    name: string;
    
    @IsInt()
    @IsOptional()
    active: number;

    @IsDate()
    @Type(() => Date)
    validTill: Date;
}