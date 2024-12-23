import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomLogger } from './custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new CustomLogger(HttpExceptionFilter.name);
  constructor(private readonly asyncContext: AsyncContext<string, string>) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    this.logger.error(
      this.asyncContext.get('traceId'),
      JSON.stringify(exception),
    );

    let message = null;
    let errors = null;

    if (exception) {
      if (exception.getResponse()) {
        if (
          exception.getResponse()['message'] != null &&
          exception.getResponse()['message'].constructor === Array
        ) {
          message = exception.getResponse()['message'].join();
        } else {
          message = exception.getResponse()['message'];
        }
        if (
            exception.getResponse()['errors'] != null &&
            Array.isArray(exception.getResponse()['errors'])
        ) {
          errors = exception.getResponse()['errors'];
        }
      }
    }
    const responseBody: any = {
      statusCode: status,
      message: message,
    };
    if (errors != null) {
      responseBody.errors = errors;
    }
    response.status(status).json(responseBody);
  }
}