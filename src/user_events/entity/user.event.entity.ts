import { Column, Entity, PrimaryColumn } from 'typeorm';
import { CommonEntity } from '../../core/common/common.entity';
import { UserEventDataDto } from '../dto/user.event.data.dto';
import { USER_EVENT_TYPES } from '../../core/common/constants';
import { UserEventRequestDto } from '../dto/user.event.request.dto';

@Entity({ name: 'user_events', schema: 'auth' })
export class UserEventEntity extends CommonEntity {
  @PrimaryColumn('integer', { nullable: false })
  id: number;

  @Column('uuid', { nullable: false })
  user_id: string;

  @Column()
  name: string;

  @Column('jsonb', {
    name: 'data',
    array: false,
    nullable: true,
  })
  data: UserEventDataDto;

  @Column('uuid', { nullable: true })
  created_by: string;

  @Column()
  is_active: boolean;

  static createNewUserEvent(
    eventName: string,
    reqBody: UserEventRequestDto,
    userId: string,
  ): UserEventEntity {
    const userEvent = new UserEventEntity();
    userEvent.user_id = userId;
    userEvent.data = new UserEventDataDto();
    userEvent.name = eventName;
    userEvent.created_by = userId;
    userEvent.updated_by = userId;
    switch (eventName) {
      case USER_EVENT_TYPES.NOTIFICATION_PERMISSION:
        userEvent.data.isNotificationPermissionGranted =
          reqBody.isNotificationPermissionGranted;
        break;
      case USER_EVENT_TYPES.OOS_ITEM_TAPPED:
        userEvent.data.skuCode = reqBody.skuCode;
        userEvent.data.eventTime = reqBody.eventTime;
        break;
      default:
        throw new Error(`Unsupported event type: ${eventName}`);
    }
    return userEvent;
  }
}
