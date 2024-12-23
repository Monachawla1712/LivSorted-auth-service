import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'society_activities', schema: 'auth' })
export class SocietyActivityEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'society_id' })
  societyId: number;

  @Column({ name: 'circulation' })
  circulation: number;

  @Column({ name: 'coupon_code' })
  couponCode: string;

  @Column({ name: 'date_of_execution' })
  dateOfExecution: Date;

  @Column({ name: 'spend' })
  spend: number;

  @Column({ name: 'type_of_activity' })
  typeOfActivity: string;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'modified_at' })
  modifiedAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'modified_by' })
  modifiedBy: string;

  static createSocietyActivityEntity(
    societyId: number,
    circulation: number,
    couponCode: string,
    dateOfExecution: string,
    spend: number,
    typeOfActivity: string,
    userid: string,
  ) {
    const entity = new SocietyActivityEntity();
    const [day, month, year] = dateOfExecution.split('/');
    entity.dateOfExecution = new Date(`${year}-${month}-${day}`);
    entity.societyId = societyId;
    entity.circulation = circulation;
    entity.couponCode = couponCode;
    entity.spend = spend;
    entity.typeOfActivity = typeOfActivity;
    entity.createdAt = new Date();
    entity.createdBy = userid;
    entity.modifiedAt = new Date();
    entity.modifiedBy = userid;
    return entity;
  }
}
