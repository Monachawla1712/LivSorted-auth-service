import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParamsService } from './params.service';
import { ParamsEntity } from './params.entity';
import { ParamsController } from './params.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ParamsEntity])],
  providers: [ParamsService],
  controllers: [ParamsController],
})
export class ParamsModule {}
