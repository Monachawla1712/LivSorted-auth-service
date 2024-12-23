import {
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { AmStoreMappingEntity } from './am-store-mapping.entity';
import { UserService } from '../user/user.service';
import { CommonService } from '../core/common/common.service';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config/configuration';
import { TargetAmStoreMappingRequestDto } from './dto/target-am-store-mapping-request.dto';

@Injectable()
export class AmStoreMappingService {
  private readonly logger = new CustomLogger(AmStoreMappingService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(AmStoreMappingEntity)
    private readonly amStoreMappingRepository: Repository<AmStoreMappingEntity>,
    private commonService: CommonService,
    private httpService: HttpService,
    private userService: UserService,
    private configService: ConfigService<Config, true>,
  ) {}

  async fetchAMStoreMappings(
    storeIds: number[],
    date: Date,
  ): Promise<AmStoreMappingEntity[]> {
    const filter: {
      storeId?: any;
      startDate?: any;
      isActive?: boolean;
    } = {};
    if (storeIds) {
      filter.storeId = In(storeIds);
    }
    filter.startDate = LessThanOrEqual(date);
    filter.isActive = true;
    return await this.amStoreMappingRepository.find({
      where: [
        {
          ...filter,
          endDate: MoreThanOrEqual(filter.startDate),
        },
        {
          ...filter,
          endDate: IsNull(),
        },
      ],
    });
  }

  async saveAll(
    amStoreMappingEntity: AmStoreMappingEntity[],
  ): Promise<AmStoreMappingEntity[]> {
    return await this.amStoreMappingRepository.save(amStoreMappingEntity);
  }

  async updateL3Owner(storeNewEntry: TargetAmStoreMappingRequestDto) {
    try {
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'post',
          baseURL:
            this.configService.get<string>('util_url') + '/targets/am/mapping',
          headers: {
            'content-type': 'application/json',
            Authorization: this.configService.get<string>('util_token'),
          },
          data: storeNewEntry,
          timeout: this.configService.get<number>('default_timeout')
        }),
      );
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while update am for am store targets',
        e,
      );
      throw new HttpException(
        {
          message:
            'Something went wrong while updating am for mapped store targets',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
