import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { UserService } from '../user/user.service';
import { CommonService } from '../core/common/common.service';
import { UserEntity } from '../user/user.entity';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { UserManagerMappingService } from './user-manager-mapping.service';
import { UserManagerMappingDto } from './dto/user-manager-mapping.dto';
import { UserManagerMappingEntity } from './user-manager-mapping.entity';
import { UserManagerMappingRequestDto } from './dto/user-manager-mapping-request.dto';
import { AmUserDetailsDto } from '../user_store/dto/am-user-details.dto';

@Controller()
@UseFilters(HttpExceptionFilter)
export class UserManagerMappingController {
  private readonly logger = new CustomLogger(UserManagerMappingController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private userService: UserService,
    private commonService: CommonService,
    private userManagerMappingService: UserManagerMappingService,
  ) {}

  @Get('/user-manager-mapping')
  async getUserManagerMapping(
    @Query('userId') userId: string,
  ): Promise<UserManagerMappingDto | null> {
    const nextDate = this.commonService.addDays(
      this.commonService.getCurrentIstDateWithoutTime(),
      1,
    );
    const entity: UserManagerMappingEntity =
      await this.userManagerMappingService.fetchUserMangerMapping(
        userId,
        nextDate,
      );
    if (!entity) {
      throw new HttpException(
        { message: 'No user manager mappings found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return await this.getUserManagerMappingDto(entity);
  }

  async getUserManagerMappingDto(
    entity: UserManagerMappingEntity,
  ): Promise<UserManagerMappingDto> {
    const response: UserManagerMappingDto = this.commonService.mapper(
      entity,
      new UserManagerMappingDto(),
      false,
    );
    const userEntityMap: Map<string, UserEntity> =
      await this.userService.getUserEntityMapByIds([
        entity.userId,
        entity.managerId,
      ]);
    response.user = this.userService.getUserDetailsFromMap(
      entity.userId,
      userEntityMap,
    );
    response.manager = this.userService.getUserDetailsFromMap(
      entity.managerId,
      userEntityMap,
    );
    this.validateUserManagerMapping(response);
    return response;
  }

  validateUserManagerMapping(
    userManagerMappingDto: UserManagerMappingDto,
  ): void {
    if (userManagerMappingDto.user.errorMsg) {
      throw new HttpException(
        {
          message: userManagerMappingDto.user.errorMsg,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    if (userManagerMappingDto.manager.errorMsg) {
      throw new HttpException(
        {
          message: 'Manager ' + userManagerMappingDto.manager.errorMsg,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post('/user-manager-mapping')
  async upsertUserManagerMapping(
    @Headers('userId') userId,
    @Body() request: UserManagerMappingRequestDto,
  ): Promise<UserManagerMappingDto> {
    if (request.managerId == request.userId) {
      throw new HttpException(
        {
          message: 'User and Manager can not be the same user',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const currentDate = this.commonService.getCurrentIstDateWithoutTime();
    const nextDate = this.commonService.addDays(currentDate, 1);
    if (
      (
        await this.userManagerMappingService.getManagerHierarchy(
          request.managerId,
          nextDate,
        )
      ).includes(request.userId)
    ) {
      throw new HttpException(
        {
          message: 'The user is already a manager of the provided manager',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const existingMapping: UserManagerMappingEntity =
      await this.userManagerMappingService.fetchUserMangerMapping(
        request.userId,
        nextDate,
      );
    if (existingMapping && request.managerId == existingMapping.managerId) {
      throw new HttpException(
        {
          message: 'User already mapped to this manager',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const newMapping: UserManagerMappingEntity = new UserManagerMappingEntity();
    newMapping.userId = request.userId;
    newMapping.managerId = request.managerId;
    newMapping.startDate = nextDate;
    newMapping.created_by = userId;
    newMapping.updated_by = userId;
    const response: UserManagerMappingDto = await this.getUserManagerMappingDto(
      newMapping,
    );
    const userManagerMappings: UserManagerMappingEntity[] = [newMapping];
    if (existingMapping) {
      if (new Date(existingMapping.startDate) > currentDate) {
        existingMapping.isActive = false;
      } else {
        existingMapping.endDate = currentDate;
      }
      existingMapping.updated_by = userId;
      userManagerMappings.push(existingMapping);
    }
    await this.userManagerMappingService.saveAll(userManagerMappings);
    return response;
  }

  @Get('/user-manager-mapping/fos')
  async getFosUserMangerTree(
    @Headers('userId') userId: string,
  ): Promise<AmUserDetailsDto> {
    if (!userId) {
      throw new HttpException(
        { message: 'Fos user id not provided' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const nextDate = this.commonService.addDays(
      this.commonService.getCurrentIstDateWithoutTime(),
      1,
    );
    const response: AmUserDetailsDto =
      await this.userManagerMappingService.getAmUserManagerTree(
        userId,
        nextDate,
        true,
      );
    if (!response) {
      throw new HttpException(
        { message: 'Fos user details not found' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return response;
  }
}
