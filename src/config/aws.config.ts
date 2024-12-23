import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';

@Injectable()
export class AwsConfig {
  private readonly sqs: SQSClient;

  constructor(private configService: ConfigService) {
    const awsAccessKey = this.configService.get<string>(
      'client_aws_access_key',
    );
    const awsSecretKey = this.configService.get<string>(
      'client_aws_secret_key',
    );

    this.sqs = new SQSClient({
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
      },
      region: 'ap-south-1',
    });
  }

  getSqs() {
    return this.sqs;
  }
}
