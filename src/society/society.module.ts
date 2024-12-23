import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocietyEntity } from './entity/society.entity';
import { SocietyService } from './society.service';
import { SocietyController } from './society.controller';
import { SocietyActivityService } from './society.activity.service';
import { SocietyActivityEntity } from './entity/society.activity.entity';
import { CommonService } from '../core/common/common.service';
import { BulkUploadEntity } from '../core/common/bulk-upload.entity';
import { ConfigService } from '@nestjs/config';
import { RestApiService } from 'src/core/rest-api-service';
import {AwsService} from "../core/common/aws.service";
import {ParamsService} from "../user_params/params.service";
import {AwsConfig} from "../config/aws.config";
import {ParamsEntity} from "../user_params/params.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SocietyEntity,
      SocietyActivityEntity,
      BulkUploadEntity,
        ParamsEntity,
    ]),
  ],
  //TODO: AwsService, AwsConfig, to be added
  providers: [
    SocietyService,
    SocietyActivityService,
    CommonService,
    ConfigService,
      AwsService,
      AwsConfig,
      ParamsService,
    RestApiService
  ],
  controllers: [SocietyController],
})
export class SocietyModule {}
