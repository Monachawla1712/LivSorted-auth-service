import { IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { UserService } from '../user/user.service';
import { CommonService } from '../core/common/common.service';
import { AmUserDetailsDto } from '../user_store/dto/am-user-details.dto';
import { UserEntity } from '../user/user.entity';
import { UserManagerMappingEntity } from './user-manager-mapping.entity';

@Injectable()
export class UserManagerMappingService {
  private readonly logger = new CustomLogger(UserManagerMappingService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(UserManagerMappingEntity)
    private readonly userManagerMappingRepository: Repository<UserManagerMappingEntity>,
    private commonService: CommonService,
    private userService: UserService,
  ) {}

  async fetchUserMangerMapping(
    userId: string,
    date: Date,
  ): Promise<UserManagerMappingEntity> {
    const filter: {
      userId?: any;
      startDate?: any;
      isActive?: boolean;
    } = {};
    if (userId) {
      filter.userId = userId;
    }
    filter.startDate = LessThanOrEqual(date);
    filter.isActive = true;
    return await this.userManagerMappingRepository.findOneBy([
      {
        ...filter,
        endDate: MoreThanOrEqual(date),
      },
      {
        ...filter,
        endDate: IsNull(),
      },
    ]);
  }

  async saveAll(
    userManagerMappingEntities: UserManagerMappingEntity[],
  ): Promise<UserManagerMappingEntity[]> {
    return await this.userManagerMappingRepository.save(
      userManagerMappingEntities,
    );
  }

  async getManagerHierarchy(amUserId: string, date: Date): Promise<string[]> {
    const result = await this.userManagerMappingRepository.query(
      `
        WITH RECURSIVE manager_tree AS (
            SELECT
                user_id,
                manager_id,
                1 as level
            FROM
                auth.user_manager_mapping
            WHERE
                user_id = $1 and is_active = true
                and start_date <= $2
                and (end_date is NULL
                 or end_date >= $2)
            UNION ALL
            SELECT
                t.user_id,
                t.manager_id,
                mt.level + 1
            FROM
                auth.user_manager_mapping t
            INNER JOIN
                manager_tree mt ON t.user_id = mt.manager_id
            WHERE t.is_active = true
                and t.start_date <= $2
                and (t.end_date is NULL
                 or t.end_date >= $2)
        )
        SELECT
            STRING_AGG(manager_id::TEXT, ',' ORDER BY level ASC) as manager_hierarchy
        FROM
            manager_tree;
    `,
      [amUserId, date],
    );
    return result && result.length > 0 && result[0].manager_hierarchy
      ? result[0].manager_hierarchy.split(',')
      : [];
  }

  async getAmUserManagerTree(
    amUserId: string,
    date: Date,
    showManagerDetails: boolean,
  ): Promise<AmUserDetailsDto> {
    const bottomUpManagerIds: string[] = showManagerDetails
      ? await this.getManagerHierarchy(amUserId, date)
      : [];
    const userEntityMap: Map<string, UserEntity> =
      await this.userService.getUserEntityMapByIds([
        ...new Set([amUserId, ...bottomUpManagerIds]),
      ]);
    const response: AmUserDetailsDto = this.commonService.mapper(
      this.userService.getUserDetailsFromMap(amUserId, userEntityMap),
      new AmUserDetailsDto(),
      false,
    );
    this.recursivelyAddManagerDetails(
      response,
      bottomUpManagerIds,
      userEntityMap,
    );
    return response;
  }

  recursivelyAddManagerDetails(
    response: AmUserDetailsDto,
    bottomUpManagerIds: string[],
    userEntityMap: Map<string, UserEntity>,
  ): void {
    if (bottomUpManagerIds.length > 0) {
      const managerId = bottomUpManagerIds.shift();
      response.manager = this.commonService.mapper(
        this.userService.getUserDetailsFromMap(managerId, userEntityMap),
        new AmUserDetailsDto(),
        false,
      );
      this.recursivelyAddManagerDetails(
        response.manager,
        bottomUpManagerIds,
        userEntityMap,
      );
    }
  }
}
