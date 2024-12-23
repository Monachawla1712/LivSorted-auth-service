import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BulkUploadEntity } from './bulk-upload.entity';
import { ConfigService } from '@nestjs/config';
import { RestApiService } from '../rest-api-service';
import { AwsService } from './aws.service';
import { AwsConfig } from '../../config/aws.config';
import {ParamsService} from "../../user_params/params.service";
import {ParamsEntity} from "../../user_params/params.entity";

@Module({
  imports: [TypeOrmModule.forFeature([BulkUploadEntity, ParamsEntity])],
  providers: [CommonService, ConfigService, RestApiService, AwsService, AwsConfig, ParamsService],
})
export class CommonModule {}
