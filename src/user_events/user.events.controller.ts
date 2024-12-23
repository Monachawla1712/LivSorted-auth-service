import {
  Body,
  Controller,
  Param,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { UserEventsService } from './user.events.service';
import { UserEventRequestDto } from './dto/user.event.request.dto';

@Controller('user/event')
@UseFilters(HttpExceptionFilter)
export class UserEventsController {
  constructor(private readonly userEventsService: UserEventsService) {}

  @Post()
  createUserEvent(
    @Query('name') name: string,
    @Body() reqBody: UserEventRequestDto,
  ) {
    return this.userEventsService.createEvent(name, reqBody);
  }
}
