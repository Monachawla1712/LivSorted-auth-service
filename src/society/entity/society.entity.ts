import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { SocietyMetadata, Tower } from './society.metadata';
import { CommonEntity } from '../../core/common/common.entity';

@Entity('society', { schema: 'auth' })
export class SocietyEntity extends CommonEntity {
  @PrimaryColumn('integer', { nullable: false })
  id: number;

  @Column('character varying', { nullable: false })
  name: string;

  @Column('double precision', { nullable: false })
  latitude: number;

  @Column('double precision', { nullable: false })
  longitude: number;

  @Column('jsonb', {
    name: 'tower',
    array: true,
    nullable: true,
  })
  tower: Tower[];

  @Column('integer', { name: 'store_id', nullable: false })
  storeId: number;

  @Column('character varying', { nullable: false })
  city: string;

  @Column('character varying', { nullable: false })
  state: string;

  @Column('character varying', { nullable: false })
  pincode: string;

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    name: 'area_polygon',
    srid: 4326,
    nullable: true,
    spatialFeatureType: 'Polygon',
  })
  areaPolygon: { coordinates: number[][][]; type: string };

  @Column('jsonb', {
    name: 'metadata',
    array: false,
    nullable: true,
  })
  metadata: SocietyMetadata;

  @Column('bool', { name: 'is_active', nullable: false })
  isActive: boolean;

  @Column('bool', { name: 'is_contact_delivery', nullable: false })
  isContactDelivery: boolean;
}
