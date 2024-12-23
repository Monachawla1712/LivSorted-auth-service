import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CommonEntity } from '../core/common/common.entity';
import { UserEntity } from '../user/user.entity';

@Entity({ name: 'otp_tokens', schema: 'auth' })
export class OtpTokensEntity extends CommonEntity {
  @PrimaryGeneratedColumn()
  id: bigint;

  @Column('varchar', { length: 6, nullable: true })
  otp: string;

  @Column('uuid', { nullable: true })
  user_id: string;

  @Index()
  @Column('varchar', { length: 12 })
  phone_number: string;

  @Column()
  valid_till: Date;

  @Column({ nullable: true })
  sent_at: Date;

  @Column({ nullable: true, default: 5 })
  retries_count: number;

  @Column({ nullable: true, default: 5 })
  retries_allowed: number;

  @Column('varchar', { nullable: true })
  verification_type: string;

  @Column('varchar', { nullable: true })
  verification_id: string;

  @Column({ default: false })
  is_active: boolean;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: UserEntity;
}
