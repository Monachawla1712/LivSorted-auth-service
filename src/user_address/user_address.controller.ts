import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { CreateAddressDto } from './dto/create_address.dto';
import { UserAddressService } from './user_address.service';
import { UpdateAddressDto } from './dto/update_address.dto';
import { UserAddressEntity } from './user_address.entity';
import { CreateAddressDtoV2 } from './dto/create_address_V2.dto';
import { CompareAddressDto } from './dto/compare_address.dto';
import { CommonService } from '../core/common/common.service';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { SocietyRequestDto } from './dto/society_request.dto';
import { UpdateOrderAddressDto } from './dto/update_order_address_request.dto';
import { UserCoordinatesDto } from './dto/user.coordinates.dto';

@Controller()
@ApiTags('User-Address')
@UseFilters(HttpExceptionFilter)
export class UserAddressController {
  private readonly logger = new CustomLogger(UserAddressController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private userAddressService: UserAddressService,
    private commonService: CommonService,
  ) {}

  @ApiBody({ type: UpdateAddressDto })
  @ApiResponse({ type: UserAddressEntity })
  @ApiParam({ name: 'addressId', required: true })
  @Patch('/addresses/:addressId')
  updateUserAddress(
    @Body() reqBody: UpdateAddressDto,
    @Headers('userId') userId: string,
    @Param() param,
  ): Promise<UserAddressEntity> {
    const address = parseInt(param.addressId);
    return this.userAddressService.updateUserAddress(reqBody, userId, address);
  }

  @ApiBody({ type: CreateAddressDto })
  @ApiResponse({ type: UserAddressEntity })
  @Post('/addresses')
  createUserAddress(
    @Body() reqBody: CreateAddressDto,
    @Headers('userId') userId: string,
  ): Promise<UserAddressEntity> {
    return this.userAddressService.createUserAddress(reqBody, userId);
  }

  @ApiResponse({ type: [UserAddressEntity] })
  @Get('/addresses')
  getUserAddresses(
    @Headers('userId') userId,
    @Headers('appId') appId: string,
    @Query('customerId') customerId: string,
  ): Promise<UserAddressEntity[]> {
    if (!this.commonService.isPosRequest(appId)) {
      customerId = userId;
    }
    this.checkCustomerId(customerId);
    return this.userAddressService.getUserAddresses(customerId);
  }

  @Delete('/addresses/:addressId')
  @ApiParam({ name: 'addressId', required: true })
  deleteUserAddresses(
    @Headers('userId') userId,
    @Param() param,
  ): Promise<{ deleted: true }> {
    const address = parseInt(param.addressId);
    return this.userAddressService.deleteUserAddress(userId, address);
  }

  @ApiBody({ type: CreateAddressDtoV2 })
  @ApiResponse({ type: UserAddressEntity })
  @Post('/addresses/v2')
  async createUserAddressV2(
    @Body() reqBody: CreateAddressDtoV2,
    @Headers('userId') userId: string,
    @Query('customerId') customerId: string,
  ): Promise<UserAddressEntity> {
    const address = await this.userAddressService.createUserAddressV2(
      reqBody,
      userId,
    );
    this.userAddressService.checkForDuplicacy(userId);
    const updateOrderAddressDto = new UpdateOrderAddressDto();
    updateOrderAddressDto.customerId = userId;
    updateOrderAddressDto.addressId = address.id;
    await this.userAddressService.updateActiveOrderAddress(
      updateOrderAddressDto,
    );
    return address;
  }

  @ApiBody({ type: CreateAddressDtoV2 })
  @ApiResponse({ type: UserAddressEntity })
  @Post('/addresses/v2/backoffice')
  createUserAddressV2BackOffice(
    @Body() reqBody: CreateAddressDtoV2,
    @Query('customerId') customerId: string,
  ): Promise<UserAddressEntity> {
    const res = this.userAddressService.createUserAddressV2(
      reqBody,
      customerId,
    );
    this.userAddressService.checkForDuplicacy(customerId);
    return res;
  }

  @ApiBody({ type: CreateAddressDtoV2 })
  @ApiResponse({ status: 200, type: CompareAddressDto })
  @Post('/addresses/compare')
  @HttpCode(200)
  getAddressComparison(@Body() reqBody: CreateAddressDtoV2) {
    return this.userAddressService.getAddressComparison(reqBody);
  }

  @Get('/society')
  async getSocietyList() {
    const societyList = await this.userAddressService.getWhSocietyList();
    return { data: societyList };
  }

  private checkCustomerId(customerId: string) {
    if (customerId == null) {
      throw new HttpException(
        { message: 'CustomerId required for POS requests.' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('/society/request')
  async getSocietyRequest(
    @Headers('userId') userId,
    @Body() reqBody: SocietyRequestDto,
  ) {
    const existingSociety = await this.userAddressService.findSocietyByName(
      reqBody.society,
    );
    if (existingSociety == null) {
      await this.userAddressService.createSocietyRequest(
          reqBody.society,
          reqBody.city,
          userId,
      );
    }
    return { success: true, message: 'Society request has been raised.' };
  }

  @Post('/coordinates/validate')
  async validateCoordinates(@Body() reqBody: UserCoordinatesDto) {
    try {
      return await this.userAddressService.isPointInArea(reqBody);
    } catch (error) {
      throw new InternalServerErrorException(
        'An error occurred while validating coordinates',
      );
    }
  }
}
