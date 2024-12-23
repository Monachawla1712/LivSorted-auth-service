import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import {AudienceRules} from "./dto/audience-rule";

@Entity({ name: 'audiences', schema: 'auth' })
export class AudienceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'is_mapped' })
  isMapped: number;

  @Column('jsonb')
  rules: AudienceRules;

  @Column()
  active: number;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'modified_at' })
  modifiedAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'modified_by' })
  modifiedBy: string;

  @Column({ name: 'valid_till', type: 'date' })
  validTill: Date;
}
