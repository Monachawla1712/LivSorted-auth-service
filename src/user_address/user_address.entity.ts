import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { CommonEntity } from '../core/common/common.entity';
import { ADDRESS_CONSTANTS } from "../core/common/constants";

@Entity({ name: 'addresses', schema: 'auth' })
export class UserAddressEntity extends CommonEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: bigint;

  @Column()
  @ApiProperty()
  user_id: string;

  @Column({ nullable: true })
  @ApiProperty()
  name: string;

  @Column()
  @ApiProperty()
  type: string;

  @Column('double precision', { nullable: true })
  @ApiPropertyOptional()
  lat?: number;

  @Column('double precision', { nullable: true })
  @ApiPropertyOptional()
  long?: number;

  @ApiPropertyOptional()
  @Column({ default: null, nullable: true })
  is_default?: boolean;

  @ApiProperty()
  @Column()
  address_line_1: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  address_line_2: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  landmark: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  city: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  state: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  pincode: number;

  @ApiPropertyOptional()
  @Column({ default: true })
  is_active: boolean;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  contact_number: string;

  @Column({ nullable: true, default: null })
  lithos_ref: number;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  floor: string;

  @ApiProperty({})
  @Column()
  house: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  street: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  society: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  sector: string;

  @Column({ nullable: true, default: null })
  society_id: number;

  @Column({ nullable: true })
  tower: string;

  static createAddress(
    name: string,
    type: string,
    addressLine1: string,
    addressLine2: string,
    landmark: string,
    lat: number,
    long: number,
    floor: string,
    house: string,
    street: string,
    society: string,
    sector: string,
    city: string,
    state: string,
    pincode: number,
    contactNumber: string,
    societyId: number,
    tower: string,
    userId: string,
    currentUserId: string,
  ) {
    const addressEntity = new UserAddressEntity();
    addressEntity.name = name;
    addressEntity.type = type;
    addressEntity.address_line_1 = addressLine1;
    addressEntity.address_line_2 = addressLine2;
    addressEntity.landmark = landmark;
    addressEntity.lat = lat;
    addressEntity.long = long;
    addressEntity.floor = floor;
    addressEntity.house = house;
    addressEntity.street = street;
    addressEntity.society = society;
    addressEntity.sector = sector;
    addressEntity.city = city;
    addressEntity.state = state;
    addressEntity.pincode = pincode;
    addressEntity.contact_number = contactNumber;
    addressEntity.society_id = societyId;
    addressEntity.tower = tower.length == 0 ? ADDRESS_CONSTANTS.DEFAULT_TOWER_NAME : tower;
    addressEntity.user_id = userId;
    addressEntity.updated_by = currentUserId;
    addressEntity.is_active = true;
    return addressEntity;
  }
}
