import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Config } from '../../config/configuration';
import { CustomLogger } from '../custom-logger';
import { AsyncContext } from '@nestjs-steroids/async-context';

@Injectable()
export class SmsService {
  private readonly logger = new CustomLogger(SmsService.name);
  constructor(
    private readonly asyncContext: AsyncContext<string, string>,
    private httpService: HttpService,
    private configService: ConfigService<Config, true>,
  ) {}
  cleanCountryCode(countryCode: string) {
    return countryCode.replace('+', '');
  }

  async sendSmsGupshup(countryCode, phoneNumber, params): Promise<any> {
    let template =
      'Hey there! {#var#} is your Handpickd verification code. Enjoy the freshest, Handpickd fruits & veggies in town!';

    const re = '{#var#}';
    template = template.replace(re, params[0]);

    const resp = await firstValueFrom(
      this.httpService.request({
        method: 'get',
        baseURL: this.configService.get<string>('gupshup_url'),
        params: {
          method: 'SendMessage',
          send_to: this.cleanCountryCode(countryCode) + phoneNumber,
          msg: template,
          msg_type: 'Unicode_text',
          userid: this.configService.get<string>('gupshup_userid'),
          auth_scheme: 'plain',
          password: this.configService.get<string>('gupshup_pwd'),
          v: '1.1',
          format: 'text',
        },
        timeout: this.configService.get<number>('default_timeout')
      }),
    );

    if (!resp.data.startsWith('success')) {
      throw new HttpException(
        { message: 'Error while sending OTP' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return resp;
  }

  async firebaseApiCall(verificationId, otp) {
    try {
      const key = this.configService.get<string>('firebase_api_key');
      const resp = await firstValueFrom(
        this.httpService.request({
          method: 'post',
          baseURL: 'https://www.googleapis.com/identitytoolkit/v3',
          url: `/relyingparty/verifyPhoneNumber`,
          params: {
            key: key,
          },
          data: {
            code: otp,
            sessionInfo: verificationId,
          },
          timeout: this.configService.get<number>('default_timeout')
        }),
      );
      return resp.status;
    } catch (e) {
      return e.response.status;
    }
  }
}
