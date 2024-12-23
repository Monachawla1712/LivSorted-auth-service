import { AsyncContext } from '@nestjs-steroids/async-context';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'papaparse';
import { Config } from 'src/config/configuration';
import { Readable } from 'stream';
import { IsNull, Repository } from 'typeorm';
import { CustomLogger } from '../custom-logger';
import { BulkUploadEntity } from './bulk-upload.entity';
import { RestApiService } from '../rest-api-service';
import { AwsGenericLambdaDto } from './dto/aws.generic.lambda.dto';
import { AwsService } from './aws.service';
import { ParamsService } from "../../user_params/params.service";
import { WalletAddOrDeductBean } from "../../user_offers/dto/wallet-add-deduct.bean";
import { UpdateCartSlotDto } from "./dto/update-cart-slot.dto";

@Injectable()
export class CommonService {
  private readonly logger = new CustomLogger(CommonService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private restApiService: RestApiService,
    @InjectRepository(BulkUploadEntity)
    private readonly bulkUploadRepository: Repository<BulkUploadEntity>,
    private configService: ConfigService<Config, true>,
    private awsService: AwsService,
    private paramService: ParamsService,
  ) {}
  toTimestamp(strDate): number {
    const datum = Date.parse(strDate) / 1000;
    return datum;
  }

  mapper(source: any, destination: any, patch: boolean): any {
    for (const property in source) {
      if (destination.hasOwnProperty(property)) {
        if (
          source[property] != null &&
          source[property].constructor != null &&
          source[property].constructor.name == 'Date'
        ) {
          destination[property] = source[property];
        } else if (source[property] instanceof Array) {
          destination[property] = source[property];
        } else if (typeof source[property] === 'object') {
          if (source[property] == null) {
            destination[property] = destination[property] || null;
          } else {
            destination[property] = destination[property] || {};
            this.mapper(source[property], destination[property], patch);
          }
        } else {
          destination[property] = source[property];
        }
      }
    }
    return destination;
  }

  isPosRequest(appId: string) {
    return appId === 'com.example.pos_flutter_app';
  }

  async getBulkUploadEntryByKey(module: string, accessKey: string) {
    return this.bulkUploadRepository.findOne({
      where: { accessKey: accessKey, module: module, status: IsNull() },
    });
  }

  async createNewBulkUploadEntry(
    data: object[],
    module: string,
    userId: string,
  ) {
    const bulkUploadEntity = new BulkUploadEntity(data, module, userId);
    return this.bulkUploadRepository.save(bulkUploadEntity);
  }

  saveBulkUploadData(bulkUploadData: BulkUploadEntity) {
    return this.bulkUploadRepository.save(bulkUploadData);
  }

  getCurrentIstDateWithoutTime(): Date {
    const currentDate = new Date();
    currentDate.setMinutes(currentDate.getMinutes() + 330);
    currentDate.setHours(0, 0, 0, 0);
    return currentDate;
  }

  addDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  getRandomBooleanValue() {
    return Boolean(Math.floor(Math.random() * 2));
  }

  async readCsvData(file) {
    const fileBufferInBase64: string = file.buffer.toString('base64');
    const buffer = Buffer.from(fileBufferInBase64, 'base64');
    const dataStream = Readable.from(buffer);
    return await this.readCSVData(dataStream);
  }

  async readCSVData(dataStream): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsedCsv = parse(dataStream, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  getHeaderMap(headerMapping: string) {
    const keyValuePairs = headerMapping.split(',');
    const resultMap = new Map();
    keyValuePairs.forEach((pair) => {
      const [value, key] = pair.split(':');
      resultMap.set(key, value);
    });
    return resultMap;
  }

  voucherOffersList(voucherOffers: string) {
    if (voucherOffers === null || voucherOffers.length === 0) return [];
    const vouchers = voucherOffers.split('|'); // Split by pipe operator
    const result = [];

    vouchers.forEach((voucher) => {
      const [name, value] = voucher.split(':'); // Split by colon
      if (name && value) {
        result.push({ name, value });
      }
    });

    return result;
  }

  async addOrDeductMoneyFromUserWallet(
      userId: string,
      amount: number,
      txnDetail: string,
      txnType: string,
  ) {
    let walletDeductBean = new WalletAddOrDeductBean();
    walletDeductBean.txnType = txnType;
    walletDeductBean.amount = amount;
    walletDeductBean.txnDetail = txnDetail;
    await this.addOrDeductApi(userId, walletDeductBean);
  }

  async addOrDeductApi(userId, walletDeductBean) {
    const addOrDeductApi =
      this.configService.get<string>('util_url') +
      `/payments/wallet/addOrDeduct/USER/${userId}`;
    try {
      return await this.restApiService.makeRequest({
        url: addOrDeductApi,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: this.configService.get<string>('util_token'),
        },
        data: walletDeductBean,
      });
    } catch (e) {
      throw new HttpException(
        {
          message: 'Failed to credit amount in customer wallet.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getWalletStatement(userId: string, pageNo: number = 1) {
    const walletStatementEndPoint =
      this.configService.get<string>('util_url') +
      `/payments/admin/walletStatement/USER/${userId}?pageNo=${pageNo}`;
    try {
      return await this.restApiService.makeRequest({
        url: walletStatementEndPoint,
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          authorization: this.configService.get<string>('util_token'),
        },
      });
    } catch (e) {
      throw new HttpException(
        {
          message: "Failed to fetch users' wallet statement.",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  removeNonNumeric(s: string): string {
    return s.replace(/[^0-9]/g, '');
  }

  async sendMessageToQueue(lambdaBean: AwsGenericLambdaDto): Promise<void> {
    try {
      const messageString = JSON.stringify(lambdaBean);
      const queueUrl = await this.paramService.getStringParamValue("SQS_QUEUE_URL", "https://sqs.ap-south-1.amazonaws.com/482450211820/generic-queue");
      await this.awsService.sendMessage(queueUrl, messageString, 0);
      this.logger.log(
        this.asyncContext.get('traceId'),
        `Message: ${messageString} sent to queue: ${queueUrl}`,
      );
    } catch (e) {
      if (e instanceof SyntaxError) {
        this.logger.log(
          'Some error occurred while converting data to JSON',
          e.toString(),
        );
      } else {
        this.logger.log(
          'Some error occurred while updating consumer status using queue',
          e.toString(),
        );
      }
    }
  }

  public isVersionGreaterOrEqual(version1: string, version2: string): boolean {
    const levels1 = version1.split('.').map(Number);
    const levels2 = version2.split('.').map(Number);

    const length = Math.max(levels1.length, levels2.length);
    for (let i = 0; i < length; i++) {
      const v1 = i < levels1.length ? levels1[i] : 0;
      const v2 = i < levels2.length ? levels2[i] : 0;
      if (v1 < v2) {
        return false;
      } else if (v1 > v2) {
        return true;
      }
    }
    return true;
  }

  async updateUserCartSlot(userId: string, slotId: number, societyId: number) {
    let updateCartSlotRequest: UpdateCartSlotDto = {
      customerId: userId,
      slotId: slotId,
      societyId: societyId,
    };
    const updateCartSlotApi =
        this.configService.get<string>('util_url') +
        '/orders/cart/slot';
    try {
      return await this.restApiService.makeRequest({
        url: updateCartSlotApi,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: this.configService.get<string>('util_token'),
        },
        data: updateCartSlotRequest,
      });
    } catch (e) {
      this.logger.error(
          this.asyncContext.get('traceId'),
          'Failed to update customer current slot .',
          e,
      );
      throw new HttpException(
          {
            message: 'Failed to update customer current slot .',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processInBatches<T>(
      items: T[],
      batchSize: number,
      processBatch: (batch: T[]) => Promise<void>
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await processBatch(batch);
    }
  }

}
