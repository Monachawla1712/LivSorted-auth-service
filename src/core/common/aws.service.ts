import { Injectable } from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  SendMessageCommandOutput,
} from '@aws-sdk/client-sqs';
import { AwsConfig } from '../../config/aws.config';
import { CustomLogger } from "../custom-logger";

@Injectable()
export class AwsService {
  private readonly sqs: SQSClient;
  private readonly logger = new CustomLogger(AwsService.name);

  constructor(private readonly awsConfig: AwsConfig) {
    this.sqs = this.awsConfig.getSqs();
  }

  async sendMessage(
    queueUrl: string,
    messageBody: string,
    delayInSeconds: number | null = null,
  ): Promise<SendMessageCommandOutput> {
    const params: any = {
      QueueUrl: queueUrl,
      MessageBody: messageBody,
    };

    if (delayInSeconds !== null) {
      params.DelaySeconds = delayInSeconds;
    }

    try {
      const command = new SendMessageCommand(params);
      const response = await this.sqs.send(command);
      this.logger.log(
          'Message sent successfully.',
          response.MessageId,
      );
      return response;
    } catch (error) {
      this.logger.error(
          'Some error occurred while sending message to SQS',
          error
      );
      throw error;
    }
  }
}
