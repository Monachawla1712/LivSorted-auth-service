import { Body, Controller, Get, Headers, Param, Post, Query, UseFilters } from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { UserAddressService } from './user_address.service';
import { UserAddressEntity } from './user_address.entity';
import { CreateAddressInternalDto } from './dto/create_address.internal.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { FetchInternalUserAddressesDto } from './dto/get_addresses.internal.dto';

@Controller('internal/addresses')
@ApiTags('Internal/User-Address')
@UseFilters(HttpExceptionFilter)
export class UserAddressInternalController {
  private readonly logger = new CustomLogger(
    UserAddressInternalController.name,
  );
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private userAddressService: UserAddressService,
  ) {}

  @ApiBody({ type: CreateAddressInternalDto })
  @ApiResponse({ type: UserAddressEntity })
  @Post()
  createUserAddressInternal(
    @Body() reqBody: CreateAddressInternalDto,
    @Headers('userId') userId: string,
  ): Promise<UserAddressEntity> {
    return this.userAddressService.createUserAddressInternal(reqBody, userId);
  }

  @ApiResponse({ type: UserAddressEntity })
  @ApiParam({ name: 'addressId', required: true })
  @Get('/:addressId')
  getUserAddressInternal(@Param() params): Promise<UserAddressEntity> {
    const addressId = parseInt(params.addressId);
    return this.userAddressService.getUserAddressesInternal(addressId);
  }

  @ApiResponse({ type: [UserAddressEntity] })
  @ApiParam({ name: 'userId', required: true })
  @Get('/user/:userId')
  getUserAddressesByUserIdInternal(
    @Param() params,
    @Query('active') activeAddress,
  ): Promise<UserAddressEntity[]> {
    const userId = params.userId;
    return this.userAddressService.getUserAddressesByUserIdInternal(userId, activeAddress);
  }

  @ApiResponse({ type: UserAddressEntity })
  @ApiParam({ name: 'refId', required: true })
  @Get('ref/:refId')
  getUserAddressesByRefInternal(@Param() params): Promise<UserAddressEntity> {
    const refId = parseInt(params.refId);
    return this.userAddressService.getUserAddressesbyRefInternal(refId);
  }

  @Post('/bulk-fetch')
  async getUserAddressesInternal(
    @Body() reqBody: FetchInternalUserAddressesDto,
  ): Promise<UserAddressEntity[]> {
    return await this.userAddressService.getUserAddressByIds(
      reqBody.addressIds,
    );
  }
}
