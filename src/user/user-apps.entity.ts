import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Unique(['userId', 'deviceId', 'packageName'])
@Entity({ name: 'user_apps', schema: 'auth' })
export class UserAppsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column('uuid', { name: 'user_id', nullable: false })
  userId: string;

  @Column({ name: 'device_id', nullable: false })
  deviceId: string;

  @Column('varchar', { name: 'package_name', length: 100, nullable: false })
  packageName: string;

  @Column('varchar', { name: 'platform_name', length: 100, nullable: false })
  platformName: string;

  @Column('varchar', { name: 'app_name', length: 100, nullable: false })
  appName: string;

  @Column({ default: 1 })
  active: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt: Date;

  @Column('uuid', { name: 'created_by', nullable: false })
  createdBy: string;

  @Column('uuid', { name: 'modified_by', nullable: false })
  modifiedBy: string;
}
