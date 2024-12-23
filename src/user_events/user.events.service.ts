import { Injectable } from '@nestjs/common';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEventEntity } from './entity/user.event.entity';
import { UserEventRequestDto } from './dto/user.event.request.dto';

@Injectable()
export class UserEventsService {
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(UserEventEntity)
    private readonly userEventRepository: Repository<UserEventEntity>,
  ) {}

  async createEvent(eventName: string, reqBody: UserEventRequestDto) {
    const userEvent = UserEventEntity.createNewUserEvent(
      eventName,
      reqBody,
      reqBody.userId,
    );
    await this.userEventRepository.save(userEvent);
    return userEvent;
  }

  async findLastEventByUserIdAndEventType(id: string, eventName: string) {
    return this.userEventRepository.findOne({
      where: { user_id: id, name: eventName },
      order: { created_at: 'DESC' },
    });
  }
}
