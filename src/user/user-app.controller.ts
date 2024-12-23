import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { UserAppListDto } from './dto/user-app.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Controller('user-apps')
@ApiTags('User')
@UseFilters(HttpExceptionFilter)
export class UserAppController {
  private readonly logger = new CustomLogger(UserAppController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private userService: UserService,
  ) {}

  @Post('batch')
  @ApiBody({ type: UserAppListDto })
  async saveUserAppsInfo(
    @Headers('userId') userId: string,
    @Body() userAppListDto: UserAppListDto,
  ) {
    const batchSuccess = await this.userService.saveBatch(
      userAppListDto,
      userId,
    );
    return { success: batchSuccess };
  }

  @Get('user')
  async getUserDevices(
    @Headers('userId') userId: string,
    @Query('deviceId') deviceId: string,
  ) {
    let userAppData = [];
    try {
      userAppData = await this.userService.getUserAppDetails(userId, deviceId);
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching user app list',
        e,
      );
    }
    return { data: userAppData };
  }
}
