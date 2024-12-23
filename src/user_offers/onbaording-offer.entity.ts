import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { CommonEntity } from "../core/common/common.entity";
import { OnboardingOfferDto } from "./dto/onboarding-offer.dto";

@Entity({ schema: 'auth', name: 'onboarding_offers' })
export class OnboardingOfferEntity extends CommonEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', nullable: false })
    signup_code: string;

    @Column({ type: 'int', array: true, nullable: false })
    society_ids: number[];

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'uuid', nullable: false })
    created_by: string;

    @Column({ type: 'jsonb', nullable: false })
    offer: OnboardingOfferDto;

    @Column({type: 'date', nullable: false})
    expiry: Date;
}
