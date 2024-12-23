import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { UserStoreMappingEntity } from './user-store-mapping.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserStoreMappingDto } from './dto/user-store-mapping.dto';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Injectable()
export class UserStoreMappingService {
  private readonly logger = new CustomLogger(UserStoreMappingService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(UserStoreMappingEntity)
    private readonly userStoreMappingRepository: Repository<UserStoreMappingEntity>,
  ) {}

  async createUserStoreMapping(
    userStoreMappingDto: UserStoreMappingDto,
    userId: string,
  ): Promise<UserStoreMappingEntity> {
    return await this.userStoreMappingRepository.save({
      ...userStoreMappingDto,
      updated_by: userId,
    });
  }

  async findByUserIdAndStoreId(
    userId: string,
    storeId: string,
  ): Promise<UserStoreMappingEntity> {
    return await this.userStoreMappingRepository.findOne({
      where: { user_id: userId, store_id: storeId },
    });
  }

  async save(
    userStoreMapping: UserStoreMappingEntity,
  ): Promise<UserStoreMappingEntity> {
    return await this.userStoreMappingRepository.save(userStoreMapping);
  }

  async findByUserId(userId: string) {
    return await this.userStoreMappingRepository.find({
      where: { user_id: userId, is_active: true },
    });
  }

  async saveMappings(userStoreMappings: UserStoreMappingEntity[]) {
    return await this.userStoreMappingRepository.save(userStoreMappings);
  }

  async findByUserIdIgnoreActive(userId: string) {
    return await this.userStoreMappingRepository.find({
      where: { user_id: userId },
    });
  }

  async upsertUsmMappings(
    userStoreMappings: UserStoreMappingEntity[],
    userId: string,
  ) {
    userStoreMappings.forEach((usm) => {
      usm.updated_by = userId;
    });
    return await this.userStoreMappingRepository.upsert(userStoreMappings, [
      'user_id',
      'store_id',
    ]);
  }

  async buildUsmCountMap(userIds: string[]): Promise<Map<string, number>> {
    const usmCountMap = new Map<string, number>();
    const usmCountList = await this.userStoreMappingRepository
      .createQueryBuilder()
      .select(['user_id', 'COALESCE(COUNT(*), 0) as count'])
      .where('user_id IN (:...userIds) AND is_active = true', { userIds })
      .groupBy('user_id')
      .getRawMany();
    usmCountList.forEach((e) => {
      usmCountMap.set(e.user_id, e.count);
    });
    return usmCountMap;
  }

  async getUserMappedStoreIds(userId: string) {
    const userStoreMapping = await this.userStoreMappingRepository.find({
      where: {
        user_id: userId,
        is_active: true,
      },
      select: ['store_id'],
    });
    return userStoreMapping.map((usm) => {
      return usm.store_id;
    });
  }
}
