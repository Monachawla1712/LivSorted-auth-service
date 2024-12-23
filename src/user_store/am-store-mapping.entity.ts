import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CommonEntity } from '../core/common/common.entity';

@Entity('am_store_mapping', { schema: 'auth' })
export class AmStoreMappingEntity extends CommonEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'integer', name: 'store_id' })
  storeId: number;

  @Column({ type: 'uuid', name: 'am_user_id' })
  amUserId: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date', nullable: true, default: null })
  endDate: Date | null;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  created_by: string;
}
