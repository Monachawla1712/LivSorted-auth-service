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

@Entity({ name: 'refresh_token', schema: 'auth' })
export class RefreshTokenEntity extends CommonEntity {
  @PrimaryGeneratedColumn()
  id: bigint;

  @Column('varchar', { length: 1000, nullable: true })
  token: string;

  @Index()
  @Column('uuid', { nullable: true })
  user_id: string;

  @Column({ nullable: true })
  valid_till: Date;

  @Column({ default: false })
  revoked: boolean;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: UserEntity;
}
