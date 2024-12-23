import { DataSource, In, Repository } from 'typeorm';
import { CreateAddressDto } from './dto/create_address.dto';
import { CreateAddressInternalDto } from './dto/create_address.internal.dto';
import {forwardRef, HttpException, HttpStatus, Inject, Injectable} from '@nestjs/common';
import { UserAddressEntity } from './user_address.entity';
import { UpdateAddressDto } from './dto/update_address.dto';
import { UpdateAddressAdminDto } from './dto/update_address_admin.dto';
import { CreateAddressDtoV2 } from './dto/create_address_V2.dto';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { GeoPosition } from 'geo-position.ts';
import { UserEntity } from '../user/user.entity';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { InjectRepository } from '@nestjs/typeorm';
import { SocietyRequestEntity } from './society_request.entity';
import { UpdateOrderAddressDto } from './dto/update_order_address_request.dto';
import { SocietyEntity } from '../society/entity/society.entity';
import { UserCoordinatesDto } from './dto/user.coordinates.dto';
import { RestApiService } from 'src/core/rest-api-service';
import { UserService } from '../user/user.service';
import { CommonService } from '../core/common/common.service';
import { AwsGenericLambdaDto } from '../core/common/dto/aws.generic.lambda.dto';

@Injectable()
export class UserAddressService {
  private readonly logger = new CustomLogger(UserAddressService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private dataSource: DataSource,
    private httpService: HttpService,
    private configService: ConfigService,
    private restApiService: RestApiService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private commonService: CommonService,
    @InjectRepository(UserAddressEntity)
    private readonly userAddressRepository: Repository<UserAddressEntity>,
    @InjectRepository(SocietyRequestEntity)
    private readonly societyRequestRepository: Repository<SocietyRequestEntity>,
    @InjectRepository(SocietyEntity)
    private readonly societyRepository: Repository<SocietyEntity>,
  ) {}

  async createUserAddress(
    addressBody: CreateAddressDto,
    user_id: string,
  ): Promise<UserAddressEntity> {
    const userRepository = this.dataSource.getRepository(UserAddressEntity);
    await userRepository.update(
      {
        user_id: user_id,
        is_active: true,
      },
      { is_active: false },
    );
    const body = {
      ...addressBody,
      user_id,
      is_active: true,
      updated_by: user_id,
      house: addressBody.address_line_1,
      street: addressBody.address_line_2,
      society: addressBody.landmark,
      sector: addressBody.city,
    };
    return await userRepository.save(body);
  }

  async updateUserAddress(
    addressBody: UpdateAddressDto,
    user_id: string,
    addressId: number,
  ): Promise<UserAddressEntity> {
    const userRepository = this.dataSource.getRepository(UserAddressEntity);

    const address = await userRepository
      .createQueryBuilder()
      .update({ is_active: false })
      .where({
        id: addressId,
        user_id: user_id,
        is_active: true,
      })
      .returning(
        'user_id, name, type, is_default, address_line_1, address_line_2, landmark, city, state, pincode, contact_number, lat, long',
      )
      .execute();

    if (!address.raw[0]) {
      throw new HttpException(
        { message: 'Address is not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    const updatedAddress = Object.assign(address.raw[0], addressBody);
    delete updatedAddress.id;

    return await userRepository.save({
      ...updatedAddress,
      updated_by: user_id,
      is_active: true,
      house: updatedAddress.address_line_1,
      street: updatedAddress.address_line_2,
      society: updatedAddress.landmark,
      sector: updatedAddress.city,
    });
  }

  async getUserAddresses(user_id: string): Promise<UserAddressEntity[]> {
    const userRepository = this.dataSource.getRepository(UserAddressEntity);
    return await userRepository.find({
      where: {
        user_id: user_id,
        is_active: true,
      },
      order: { created_at: 'DESC' },
    });
  }

  async getUserAddressesByUserIdInternal(
    user_id: string,
    getActiveAddress: string,
  ): Promise<UserAddressEntity[]> {
    const userRepository = this.dataSource.getRepository(UserAddressEntity);
    if (getActiveAddress != null && getActiveAddress == 'true') {
      return await userRepository.findBy({
        user_id: user_id,
        is_active: true,
      });
    }
    return await userRepository.findBy({
      user_id: user_id,
    });
  }

  async deleteUserAddress(
    user_id: string,
    addressId: number,
  ): Promise<{ deleted: true }> {
    const userRepository = this.dataSource.getRepository(UserAddressEntity);

    const address = await userRepository
      .createQueryBuilder()
      .update({ is_active: false })
      .where({
        id: addressId,
        user_id: user_id,
        is_active: true,
      })
      .returning('*')
      .execute();

    if (!address.raw[0]) {
      throw new HttpException(
        { message: 'Address is not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return { deleted: true };
  }

  async createUserAddressInternal(
    addressBody: CreateAddressInternalDto,
    user_id: string,
  ): Promise<UserAddressEntity> {
    await this.userAddressRepository.update(
      {
        user_id: user_id,
        is_active: true,
      },
      { is_active: false },
    );
    const address = UserAddressEntity.createAddress(
      addressBody.name,
      'OTHER',
      (addressBody.floor != null && addressBody.floor.length > 0
        ? addressBody.floor + ', '
        : '') + addressBody.house,
      addressBody.street,
      addressBody.society,
      addressBody.lat,
      addressBody.long,
      addressBody.floor,
      addressBody.house,
      addressBody.street,
      addressBody.society,
      addressBody.sector,
      addressBody.city,
      addressBody.state,
      addressBody.pincode,
      addressBody.contact_number,
      addressBody.society_id,
      addressBody.tower,
      addressBody.user_id,
      user_id,
    );
    return await this.userAddressRepository.save(address);
  }

  async getUserAddressesInternal(
    addressId: number,
  ): Promise<UserAddressEntity> {
    const userRepository = this.dataSource.getRepository(UserAddressEntity);

    const address = await userRepository
      .createQueryBuilder()
      .where({
        id: addressId,
      })
      .getOne();

    if (!address) {
      throw new HttpException(
        { message: 'Address is not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return address;
  }

  async getUserAddressesbyRefInternal(
    refId: number,
  ): Promise<UserAddressEntity> {
    const userRepository = this.dataSource.getRepository(UserAddressEntity);

    const address = await userRepository
      .createQueryBuilder()
      .where({
        lithos_ref: refId,
      })
      .getOne();

    if (!address) {
      throw new HttpException(
        { message: 'Ref not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return address;
  }

  async updateUserAddressByAdmin(
    addressBody: UpdateAddressAdminDto,
    user_id: string,
    addressId: bigint,
  ): Promise<UserAddressEntity> {
    const userAddressRepository =
      this.dataSource.getRepository(UserAddressEntity);

    const address = await userAddressRepository.findOne({
      where: { id: addressId },
    });

    if (address == null) {
      throw new HttpException(
        { message: 'Address not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    await userAddressRepository.update(
      {
        user_id: address.user_id,
        is_active: true,
      },
      { is_active: false },
    );

    const updatedAddress = Object.assign(address, addressBody);
    delete updatedAddress.id;

    return await userAddressRepository.save(address);
  }

  async getUserAddressesByAdmin(user_id: string): Promise<UserAddressEntity[]> {
    const userAddressRepository =
      this.dataSource.getRepository(UserAddressEntity);
    return await userAddressRepository.findBy({
      user_id: user_id,
      is_active: true,
    });
  }

  async createUserAddressV2(
    addressBody: CreateAddressDtoV2,
    user_id: string,
  ): Promise<UserAddressEntity> {
    const previousAddress = await this.userAddressRepository.findOne({
      where: {user_id: user_id, is_active: true},
    });
    if (previousAddress != null) {
      previousAddress.is_active = false;
      await this.userAddressRepository.save(previousAddress);
    }
    if (previousAddress == null || (previousAddress?.society_id != addressBody.society_id)) {
      this.userService.updateSocietyUserAudience(user_id, addressBody.society_id, previousAddress?.society_id);
    }

    const address = UserAddressEntity.createAddress(
      addressBody.name,
      addressBody.type,
      (addressBody.floor != null && addressBody.floor.length > 0
        ? addressBody.floor + ', '
        : '') + addressBody.house,
      addressBody.street,
      addressBody.society,
      addressBody.lat,
      addressBody.long,
      addressBody.floor,
      addressBody.house,
      addressBody.street,
      addressBody.society,
      addressBody.sector,
      addressBody.city,
      addressBody.state,
      addressBody.pincode,
      addressBody.contact_number,
      addressBody.society_id,
      addressBody.tower,
      user_id,
      user_id,
    );
    return await this.userAddressRepository.save(address);
  }

  async getAddressComparison(address: CreateAddressDtoV2) {
    const searchAddressLine =
      address.sector + ' ' + address.society + ' ' + address.city;

    const resp = await firstValueFrom(
      this.httpService.request({
        method: 'POST',
        baseURL: this.configService.get<string>('util_url'),
        url: '/util/geo/coordinates',
        headers: {
          Authorization: this.configService.get<string>('util_token'),
          'content-type': 'application/json',
        },
        data: {
          input: searchAddressLine,
        },
        timeout: this.configService.get<number>('default_timeout')
      }),
    );

    if (resp.status != 200) {
      throw new HttpException(
        { message: 'Error while getting address comparison from Google Maps' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const geoLoc1 = new GeoPosition(address.lat, address.long);

    const geoLoc2 = new GeoPosition(resp.data.lat, resp.data.long);

    const GeoDistance = geoLoc1.Distance(geoLoc2);

    return {
      lat: address.lat,
      long: address.long,
      isFar: GeoDistance > 500,
    };
  }

  async createUserAddressFromText(
    user: UserEntity,
    address: string,
    pincode: number,
  ) {
    let resp = null;
    try {
      resp = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          baseURL: this.configService.get<string>('util_url'),
          url: '/util/geo/coordinates',
          headers: {
            Authorization: this.configService.get<string>('util_token'),
            'content-type': 'application/json',
          },
          data: {
            input: address,
          },
          timeout: this.configService.get<number>('default_timeout')
        }),
      );
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching coordinates from text',
        e,
      );
    }

    const aa = {
      address_line_1: address,
      house: address,
      type: 'HOME',
      sector: 'NO_CITY',
      city: 'NO_CITY',
      contact_number: user.phone_number,
      pincode: pincode,
      state: 'NO_STATE',
      lat: resp != null && resp.data != null ? resp.data.lat : 28.4458,
      long: resp != null && resp.data != null ? resp.data.long : 77.0469,
      user_id: user.id,
    }; // state and rest could be added using geolocation APIs

    const userAddressEntity = new UserAddressEntity();
    Object.assign(userAddressEntity, aa);

    const userAddressRepository =
      this.dataSource.getRepository(UserAddressEntity);

    await userAddressRepository.save(userAddressEntity);

    return userAddressEntity;
  }

  async getUserAddressByUserIds(userIds: string[]) {
    const userAddressRepository =
      this.dataSource.getRepository(UserAddressEntity);
    return await userAddressRepository.find({
      where: { user_id: In(userIds), is_active: true },
    });
  }

  async getUserAddressByIds(addressIds: number[]) {
    const userAddressRepository =
      this.dataSource.getRepository(UserAddressEntity);
    return await userAddressRepository.find({
      where: { id: In(addressIds) },
    });
  }

  async getUserAddressBySocietyId(societyId: number, userIds: string[]) {
    const userAddressRepository =
      this.dataSource.getRepository(UserAddressEntity);
    let condition: any = { society_id: societyId, is_active: true };

    if (userIds != null && userIds.length != 0) {
      condition.user_id = In(userIds);
    }
    return await userAddressRepository.find({
      where: condition,
    });
  }

  async getWhSocietyList() {
    try {
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'get',
          baseURL:
            this.configService.get<string>('warehouse_url') +
            '/api/v1/ppd/society',
          headers: {
            'content-type': 'application/json',
            'rz-auth-key': this.configService.get<string>('rz_auth_key'),
          },
          timeout: this.configService.get<number>('default_timeout')
        }),
      );
      const sortedList = resp.data
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
      return sortedList;
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching society info from warehouse',
        e,
      );
      throw new HttpException(
        { message: 'Something went wrong while society data from Warehouse.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createSocietyRequest(society: string, city: string, userId: string) {
    const societyRequest = SocietyRequestEntity.createNewSocietyRequest(
      society,
      city,
      userId,
    );
    await this.societyRequestRepository.save(societyRequest);
  }

  async findSocietyByName(society: string) {
    return await this.societyRequestRepository.findOne({
      where: { society: society },
    });
  }

  async updateActiveOrderAddress(updateOrderAddressDto: UpdateOrderAddressDto) {
    try {
      const orderServiceURL =
        this.configService.get<string>('util_url') + '/orders/cart/address';
      return await this.restApiService.makeRequest({
        url: orderServiceURL,
        method: 'POST',
        headers: {
          contentType: 'application/json',
          Authorization: this.configService.get<string>('util_token'),
        },
        data: updateOrderAddressDto,
      });
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Error fetching user cart: ',
        e,
      );
    }
  }

  async isPointInArea(locationData: UserCoordinatesDto) {
    const societyId = locationData.societyId;
    const lat = locationData.latitude;
    const long = locationData.longitude;
    const res = await this.societyRepository
      .createQueryBuilder('society')
      .where('society.id = :societyId', { societyId })
      .andWhere(
        'ST_Contains(society.areaPolygon, ST_SetSRID(ST_MakePoint(:long, :lat), 4326)) = true',
        { lat, long },
      )
      .getOne();
    return {
      isInArea: !!res,
      message: !!res
        ? 'The coordinates are within the specified area.'
        : 'The coordinates are outside the specified area.',
    };
  }

  async getParentUserForDuplicateUsers(
      user: UserEntity,
      activeAddress: UserAddressEntity,
  ) {
    const floor = this.commonService.removeNonNumeric(activeAddress.floor);
    const house = this.commonService.removeNonNumeric(activeAddress.house);
    const userId = user.id;
    const userCreatedAt = user.created_at;

    const query = this.userAddressRepository
      .createQueryBuilder('a')
      .select([
        'a.user_id AS userId',
        'u.created_at AS creationTime',
        "COALESCE(u.user_preferences ->> 'orderCount', '0')::integer AS orderCount",
      ])
      .innerJoin('user', 'u', 'u.id::text = a.user_id::text')
      .where('a.society_id = :societyId', {
        societyId: activeAddress.society_id,
      })
      .andWhere('a.tower = :tower', { tower: activeAddress.tower })
      .andWhere('a.is_active = true')
        .andWhere("u.meta_data->>'isDuplicateUser' = 'false'")
        .andWhere('u.created_at > :date', { date: new Date('2024-02-20') })
      .andWhere('a.user_id != :userId', { userId });
    if (floor && floor.trim() !== '') {
      query.andWhere(
        "NULLIF(regexp_replace(a.floor, '\\D','','g'), '')::numeric = :floor",
        { floor },
      );
    }
    if (house && house.trim() !== '') {
      query.andWhere(
        "NULLIF(regexp_replace(a.house, '\\D','','g'), '')::numeric = :house",
        { house },
      );
    }
    query
        .orderBy(
            "COALESCE(u.user_preferences ->> 'orderCount', '0')::integer",
            'DESC',
        )
        .addOrderBy('u.created_at', 'ASC')
        .limit(1);
    return query.getRawOne();
  }

  checkForDuplicacy(userId: string) {
    const url = `${this.configService.get<string>(
      'consumer_url',
    )}/auth/internal/user/${userId}/duplicate`;
    const params = { id: userId };
    const headers = {
      Authorization: this.configService.get('util_token'),
    };
    let lambda = AwsGenericLambdaDto.createGenericLambdaDto(
      url,
      'POST',
      headers,
      params,
      {},
    );
    this.commonService.sendMessageToQueue(lambda);
  }
}
