import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'user_audience', schema: 'auth' })
export class UserAudienceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'audience_id' })
  audienceId: number;

  @Column()
  active: number;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'modified_at' })
  modifiedAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'modified_by' })
  modifiedBy: string;

   static createUserAudienceEntity(entityId: string, audienceId: number, userId: string, entityType: string): UserAudienceEntity {
    const userAudience = new UserAudienceEntity();
    userAudience.entityId = entityId;
    userAudience.entityType = entityType;
    userAudience.audienceId = audienceId;
    userAudience.createdBy = userId;
    userAudience.modifiedBy = userId;
    return userAudience;
  }
}
