import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { CommonEntity } from '../core/common/common.entity';

@Entity({ name: 'user_store_mapping', schema: 'auth' })
export class UserStoreMappingEntity extends CommonEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: bigint;

  @Column('uuid', { nullable: false })
  @ApiProperty()
  user_id: string;

  @Column({ nullable: false })
  @ApiProperty()
  store_id: string;

  @ApiPropertyOptional()
  @Column({ default: true })
  is_active: boolean;

  static createNewMapping(userId, storeId) {
    const mapping = new UserStoreMappingEntity();
    mapping.user_id = userId;
    mapping.store_id = storeId;
    return mapping;
  }
}
