import { CommonEntity } from 'src/core/common/common.entity';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EligibleOffersMetadataDto } from './dto/eligible-offers-metadata.dto';
import { EligibleOffersSkusDto } from './dto/eligible-offers-skus.dto';

@Entity({ name: 'eligible_offers', schema: 'auth' })
export class EligibleOffersEntity extends CommonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  created_by: string;

  @Column('integer', { name: 'society_id' })
  society_id: number;

  @Column('varchar')
  offer_name: string;

  @Column('jsonb', { name: 'skus' })
  skus: EligibleOffersSkusDto[];

  @Column()
  offer_start: Date;

  @Column({ default: true })
  active?: boolean;

  @Column('jsonb', { name: 'metadata' })
  metadata: EligibleOffersMetadataDto;
}
