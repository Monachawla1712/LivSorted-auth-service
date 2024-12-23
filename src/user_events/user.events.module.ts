import { Module } from '@nestjs/common';
import { UserEventsService } from './user.events.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity';
import { HttpModule } from '@nestjs/axios';
import { UserEventEntity } from './entity/user.event.entity';
import { UserEventsController } from './user.events.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserEventEntity]),
    HttpModule,
  ],
  providers: [UserEventsService],
  controllers: [UserEventsController],
})
export class UserEventsModule {}
