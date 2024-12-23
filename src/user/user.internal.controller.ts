import {
  Body,
  Controller, Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus, Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { InternalCreateUserDto } from './dto/internal-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UserStoreMappingEntity } from '../user_store/user-store-mapping.entity';
import { UserStoreMappingService } from '../user_store/user-store-mapping.service';
import { GetUsersDto } from './dto/get-users.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { ParamsService } from '../user_params/params.service';
import { UpdateUserBackofficeDto } from './dto/update-user-backoffice.dto';
import { UserEntity } from './user.entity';
import { UserRole } from './enum/user.role';
import { UserAddressService } from '../user_address/user_address.service';
import { UserAddressEntity } from '../user_address/user_address.entity';
import { PaymentMethod } from './dto/user-pref.dto';
import { HttpStatusCode } from 'axios';
import { AudienceDto } from './dto/audience.dto';
import { SocietyAudienceDto } from "./dto/society-audience.dto";

@Controller()
@ApiTags('User - Internal')
@UseFilters(HttpExceptionFilter)
export class InternalUserController {
  private readonly logger = new CustomLogger(InternalUserController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private userService: UserService,
    private userAddressService: UserAddressService,
    private userStoreMappingService: UserStoreMappingService,
    private paramsService: ParamsService,
  ) {}

  @Post('internal/user')
  @ApiBody({ type: InternalCreateUserDto })
  internalCreateUser(@Body() internalCreateUserDto: InternalCreateUserDto) {
    return this.userService.createInternalUser(internalCreateUserDto);
  }

  @Get('internal/user/:id')
  getUser(@Param('id') id: string) {
    return this.userService.getUserFromId(id);
  }

  @Post('internal/user/:id')
  updateUserPref(
    @Param('id') id: string,
    @Query('orderCount') orderCount: number,
    @Query('paymentMethod') paymentMethod: PaymentMethod,
    @Query('slot') slot: number,
  ) {
    return this.userService.updateUserPref(id, orderCount, paymentMethod,slot);
  }

  @Post('internal/user/society/:id')
  async getUsersBySociety(
    @Param('id') id: number,
    @Body('userIds') userIds: string[],
  ) {
    const addresses = await this.userAddressService.getUserAddressBySocietyId(
      id,
      userIds,
    );
    const addressMap = await this.getUserAddressMap(addresses);
    const keys = Array.from(addressMap.keys());
    let users = await this.userService.getActiveUserFromIds(keys);
    users = users.map((user) => {
      const address = addressMap.get(user.id);
      if (address) {
        user.address = address;
      }
      return user;
    });
    return users;
  }

  private async getUserAddressMap(addresses: UserAddressEntity[]) {
    const addressMap = new Map<string, UserAddressEntity>();
    for (const address of addresses) {
      addressMap.set(address.user_id, address);
    }
    return addressMap;
  }

  @Post('internal/users')
  async getUsers(@Body() data: GetUsersDto) {
    return await this.userService.getUserFromIds(data.ids);
  }

  @Get('admin/user')
  async getUserAdmin(@Query('phoneNumber') phoneNumber: string) {
    if (phoneNumber == null) {
      throw new HttpException({ message: 'please provide phone number.' }, 400);
    }
    const user = await this.userService.getUserFromPhone(phoneNumber);
    if (user == null) {
      throw new HttpException(
        { message: 'user not found' },
        HttpStatus.NOT_FOUND,
      );
    }
    const userStoreMappings = await this.userStoreMappingService.findByUserId(
      user.id,
    );
    const userStoreIds = userStoreMappings.map((userStoreMapping) => {
      return userStoreMapping.store_id;
    });
    return { user: user, mappedStores: userStoreIds };
  }

  @Put('admin/user')
  async updateUserAdmin(@Body() adminUpdateUserDto: AdminUpdateUserDto) {
    const user = await this.userService.getUserFromId(
      adminUpdateUserDto.userId,
    );
    if (user == null) {
      throw new HttpException({ message: 'user not found' }, 404);
    }
    const usmLimit: number = await this.paramsService.getNumberParamValue(
      'USM_LIMIT',
      1000,
    );
    if (adminUpdateUserDto.storeIds.length > usmLimit) {
      throw new HttpException(
        {
          message: 'User store mappings exceeds limit of ' + usmLimit,
        },
        400,
      );
    }
    const userStoreMappings =
      await this.userStoreMappingService.findByUserIdIgnoreActive(
        adminUpdateUserDto.userId,
      );
    const storeIdsMap = new Map<string, UserStoreMappingEntity>();
    userStoreMappings.forEach((userStoreMapping) => {
      storeIdsMap.set(userStoreMapping.store_id, userStoreMapping);
    });
    for (const mapping of userStoreMappings) {
      mapping.is_active = false;
    }
    for (const storeId of adminUpdateUserDto.storeIds) {
      if (!storeIdsMap.has(storeId)) {
        userStoreMappings.push(
          UserStoreMappingEntity.createNewMapping(
            adminUpdateUserDto.userId,
            storeId,
          ),
        );
      } else {
        storeIdsMap.get(storeId).is_active = true;
      }
    }
    const mappedStores = await this.userStoreMappingService.saveMappings(
      userStoreMappings,
    );
    return {
      user: user,
      mappedStores: mappedStores
        .filter((store) => store.is_active)
        .map((store) => store.store_id),
    };
  }

  @Patch('user/backoffice/:id')
  @ApiBody({ type: UpdateUserBackofficeDto })
  async updateUserBackoffice(
    @Param('id') id: string,
    @Body() dto: UpdateUserBackofficeDto,
  ) {
    let user: UserEntity = await this.userService.getActiveUserById(id);
    if (user == null) {
      throw new HttpException(
        {
          message: 'User not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    if (dto.roles != null && dto.roles.length > 1) {
      this.checkCreditLimitRoles(dto.roles);
      this.checkCCRoles(dto.roles);
    }
    for (const key of Object.keys(dto)) {
      if (key != null) {
        user[key] = dto[key];
      }
    }
    user = await this.userService.saveUser(user);
    return user;
  }

  private checkCreditLimitRoles(roles: string[]) {
    const creditLimitRolesSet = new Set([
      UserRole.CREDITLIMIT1.toString(),
      UserRole.CREDITLIMIT2.toString(),
      UserRole.ADMIN.toString(),
    ]);
    const foundValues = roles.filter((value) => creditLimitRolesSet.has(value));
    if (foundValues.length > 1) {
      throw new HttpException(
        {
          message:
            'User cannot have multiple credit limit roles at the same time',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private checkCCRoles(roles: string[]) {
    const ccRolesSet = new Set([
      UserRole.CC1.toString(),
      UserRole.CC2.toString(),
      UserRole.ADMIN.toString(),
    ]);
    const foundValues = roles.filter((value) => ccRolesSet.has(value));
    if (foundValues.length > 1) {
      throw new HttpException(
        {
          message:
            'User cannot have multiple cash collector roles at the same time',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('internal/user')
  async getUserByPhone(@Query('phoneNumber') phoneNumber: string) {
    if (phoneNumber == null) {
      throw new HttpException({ message: 'please provide phone number.' }, 400);
    }
    const user = await this.userService.getUserFromPhone(phoneNumber);
    if (user == null) {
      throw new HttpException(
        { message: 'user not found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return user;
  }

  @Get('internal/user/:id/audience')
  async getUserAudience(@Param('id') userId: string) {
    return await this.userService.getUserAudience(userId);
  }

  @Get('internal/audience')
  async getAudienceByIds(@Query('ids') ids: string) {
    const auidenceIds = ids.split(',').map((id) => Number(id));
    const audienceEntities = await this.userService.getAudiencesByIds(
      auidenceIds,
    );
    return audienceEntities.map((audienceEntity) => {
      return {
        id: audienceEntity.id,
      };
    });
  }

  @Post('internal/audience/user/deactivate')
  @HttpCode(HttpStatusCode.Ok)
  async deleteAudienceParams(@Headers('userId') userId: string) {
    await this.userService.deactivateDefaultAudienceUsers(userId);
  }

  @Get('/audience')
  async getAudiences(@Query('page') page = 1, @Query('limit') limit = 25) {
    return await this.userService.getAllAudience(page, limit);
  }

  @Post('audience')
  async createAudience(
    @Body() audienceDto: AudienceDto,
    @Headers('userId') userId: string,
  ) {
    return await this.userService.createAudience(audienceDto, userId);
  }

  @Put('audience')
  async updateAudience(
    @Body() audienceDto: AudienceDto,
    @Headers('userId') userId: string,
  ) {
    return await this.userService.updateAudience(audienceDto, userId);
  }

  @Post('internal/fraud-duplicate-users')
  async filterFraudAndDuplicateUsers() {
    this.logger.log(
        this.asyncContext.get('traceId'),
        'filterFraudAndDuplicateUsers triggered',
    );
    await this.userService.filterFraudAndDuplicateUsers();
  }

  @Post('internal/user/:id/duplicate')
  async setParentUserDetailsInDuplicateUser(@Param('id') userId: string) {
    const user = await this.userService.getActiveUserById(userId);
    if (user == null) {
      return;
    }
    const addresses =
      await this.userAddressService.getUserAddressesByUserIdInternal(
        userId,
        'true',
      );
    await this.userService.setDuplicateParent(user, addresses[0]);
    await this.userService.saveUser(user);
  }

  @Get('audience/society')
  async getSocietyAudienceMappings() {
    return await this.userService.getSocietyAudienceMapping();
  }

  @Post('audience/society')
  async createSocietyAudienceMapping(
      @Headers('userId') adminId: string,
      @Body() societyAudienceDto: SocietyAudienceDto
  ) {
    return await this.userService.createSocietyAudienceMapping(societyAudienceDto,adminId);
  }

  @Delete('audience/society')
  async removeSocietyAudienceMapping(
      @Headers('userId') adminId: string  ,
      @Body() societyAudienceDto: SocietyAudienceDto
  ) {
    return await this.userService.removeSocietyAudienceMapping(societyAudienceDto,adminId);
  }

  @Post('internal/user/first-order-flow/deactivate')
  markFirstOrderFlowViewed(
      @Body() userIds: string[],
      @Headers("userId") adminId: string
  ) {
    this.userService.markFirstOrderFlowViewed(userIds, adminId);
  }

}
