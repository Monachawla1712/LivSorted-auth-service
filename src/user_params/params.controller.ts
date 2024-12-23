import { Controller, UseFilters, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from '../core/http-exception.filter';
import { ParamsService } from './params.service';
import { CustomLogger } from '../core/custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Controller('params')
@ApiTags('User-Address')
@UseFilters(HttpExceptionFilter)
export class ParamsController {
  private readonly logger = new CustomLogger(ParamsController.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private paramsService: ParamsService,
  ) {}

  @Get('ios-package-names')
  async getIosPackageNamesMap() {
    const packageList = await this.paramsService.getJsonParamValue(
      'IOS_PACKAGE_MAP',
      [],
    );
    return { packageList: packageList };
  }
}
