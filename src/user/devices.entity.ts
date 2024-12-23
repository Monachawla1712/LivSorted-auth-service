import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'devices', schema: 'auth' })
export class DevicesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column({ name: 'device_id' })
  deviceId: string;

  @Column({ name: 'app_name' })
  appName: string;

  @Column({ name: 'last_accessed_at', nullable: true })
  lastAccessedAt: Date;

  @Column({ name: 'serial_number' })
  serialNumber: string;

  @Column({ name: 'advertisement_id' })
  advertisementId: string;

  @Column('varchar', { name: 'mac_address', length: 100, nullable: true })
  macAddress: string;

  @Column('varchar', { length: 100, nullable: true })
  manufacturer: string;

  @Column('varchar', { length: 100, nullable: true })
  model: string;

  @Column('varchar', { length: 100, nullable: true })
  os: string;

  @Column('varchar', { name: 'app_version', length: 20, nullable: true })
  appVersion: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column('varchar', {
    name: 'notification_token',
    length: 255,
    nullable: true,
  })
  notificationToken: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column('uuid', { name: 'updated_by' })
  updatedBy: string;
}
