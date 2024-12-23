import {IsInt} from "class-validator";

export class SocietyAudienceDto {
    @IsInt()
    societyId: number;

    @IsInt()
    audienceId: number;
}