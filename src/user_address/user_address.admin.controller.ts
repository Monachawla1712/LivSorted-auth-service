import {
  Body,
  Controller,
  Headers,
  UseFilters,
  Param,
  Get,
  Patch,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { UserAddressService } from './user_address.service';
import { UserAddressEntity } from './user_address.entity';
import { UpdateAddressAdminDto } from './dto/update_address_admin.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Controller('admin/addresses')
@ApiTags('Admin/User-Address')
@UseFilters(HttpExceptionFilter)
export class UserAddressAdminController {
  private readonly logger = new CustomLogger(UserAddressAdminController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private userAddressService: UserAddressService,
  ) {}

  @ApiBody({ type: UpdateAddressAdminDto })
  @ApiResponse({ type: UserAddressEntity })
  @ApiParam({ name: 'addressId', required: true })
  @Patch('/:addressId')
  updateUserAddressByAdmin(
    @Body() reqBody: UpdateAddressAdminDto,
    @Headers('userId') userId: string,
    @Param('addressId') addressId: bigint,
  ): Promise<UserAddressEntity> {
    return this.userAddressService.updateUserAddressByAdmin(
      reqBody,
      userId,
      addressId,
    );
  }

  @ApiResponse({ type: [UserAddressEntity] })
  @Get('/:userId')
  getUserAddressesByAdmin(
    @Param('userId') userId: string,
  ): Promise<UserAddressEntity[]> {
    return this.userAddressService.getUserAddressesByAdmin(userId);
  }
}
