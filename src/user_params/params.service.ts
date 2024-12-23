import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { ParamsEntity } from './params.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Injectable()
export class ParamsService {
  private readonly logger = new CustomLogger(ParamsService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    @InjectRepository(ParamsEntity)
    private readonly storeParamsRepository: Repository<ParamsEntity>,
  ) {}

  async getNumberParamValue(paramKey: string, defaultValue: number) {
    try {
      const param = await this.storeParamsRepository.findOne({
        where: { param_key: paramKey },
      });
      if (param == null) {
        return defaultValue;
      }
      return Number(param.param_value);
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching paramKey :' + paramKey,
        e,
      );
      return defaultValue;
    }
  }

  async getJsonParamValue(paramKey: string, defaultValue: object) {
    try {
      const param = await this.storeParamsRepository.findOne({
        where: { param_key: paramKey },
      });
      if (param == null) {
        return defaultValue;
      }
      return JSON.parse(param.param_value);
    } catch (e) {
      this.logger.error(
        this.asyncContext.get('traceId'),
        'Something went wrong while fetching paramKey :' + paramKey,
        e,
      );
      return defaultValue;
    }
  }

  async getStringParamValue(paramKey: string, defaultValue: string) {
    try {
      const param = await this.storeParamsRepository.findOne({
        where: { param_key: paramKey },
      });
      if (param == null) {
        return defaultValue;
      }
      return param.param_value;
    } catch (e) {
      this.logger.error(
          this.asyncContext.get('traceId'),
          'Something went wrong while fetching paramKey :' + paramKey,
          e,
      );
      return defaultValue;
    }
  }

  async saveParam(paramKey: string, paramValue: string) {
    try {
      const param = await this.storeParamsRepository.findOne({
        where: {param_key: paramKey},
      });
      param.param_value = paramValue;
      await this.storeParamsRepository.save(param);
    } catch (e) {
      this.logger.error(
          this.asyncContext.get('traceId'),
          'Something went wrong while saving paramKey :' + paramKey,
          e,
      );
    }
  }
}
