import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'society_request', schema: 'auth' })
export class SocietyRequestEntity {
  @PrimaryGeneratedColumn()
  id: bigint;

  @Column()
  society: string;

  @Column()
  city: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt: Date;

  @Column({ name: 'modified_by' })
  modifiedBy: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  static createNewSocietyRequest(
    society: string,
    city: string,
    userId: string,
  ) {
    const societyRequest = new SocietyRequestEntity();
    societyRequest.society = society;
    societyRequest.city = city;
    societyRequest.createdBy = userId;
    societyRequest.modifiedBy = userId;
    return societyRequest;
  }
}
