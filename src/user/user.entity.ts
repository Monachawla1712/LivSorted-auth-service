import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { UserRole } from './enum/user.role';
import Any = jasmine.Any;
import { CommonEntity } from '../core/common/common.entity';
import { UserAddressEntity } from '../user_address/user_address.entity';
import { UserPreferences } from './dto/user-pref.dto';
import { EligibleOffers } from './dto/eligible-offers.dto';
import { UserMetadataDto } from './dto/user-metadata.dto';

@Entity({ name: 'user', schema: 'auth' })
export class UserEntity extends CommonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100, nullable: true })
  greeting: string;

  @Column('varchar', { length: 100, nullable: true })
  name: string;

  @Column('varchar', { length: 5, nullable: true })
  country_code: string;

  @Index()
  @Column('varchar', { length: 15, nullable: true })
  phone_number: string;

  @Column('varchar', { length: 255, nullable: true })
  email: string;

  @Column('varchar', { length: 255, nullable: true })
  avatar_url: string;

  @Column({ nullable: true })
  phone_confirmed_at: Date;

  @Column({ nullable: true })
  email_confirmed_at: Date;

  @Column({ nullable: true })
  last_sign_in_at: Date;

  @Column({
    type: 'jsonb',
    array: false,
    default: () => "'{}'",
    nullable: true,
  })
  meta_data: UserMetadataDto;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ default: false })
  is_blocked: boolean;

  @Column({ default: false })
  is_deleted: boolean;

  @Column({ nullable: true })
  banned_until: Date;

  @Column({
    type: 'enum',
    enum: UserRole,
    array: true,
    default: [UserRole.VISITOR],
  })
  roles: UserRole[];

  address: UserAddressEntity;

  @Column({ default: false })
  whatsapp_opt_in: boolean;

  @Column('varchar', { length: 100, nullable: true })
  greeting_suffix: string;

  @Column('integer', { name: 'easebuzz_virtual_account_id' })
  easebuzzVirtualAccountId: number;

  @Column('character varying', { name: 'easebuzz_qr_code' })
  easebuzzQrCode: string;

  @Column('integer', { name: 'preferred_slot_id' })
  preferredSlotId: number;

  @Column('jsonb', { name: 'user_preferences' })
  userPreferences: UserPreferences;

  @Column('jsonb', { name: 'eligible_offers' })
  eligible_offers: EligibleOffers;
}
