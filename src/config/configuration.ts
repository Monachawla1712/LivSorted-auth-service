import { EnvironmentVariables } from './env.validation';

export interface Config {
  appEnv: string;
  port: string;
  db_url: string;
  at_secret: string;
  rt_secret: string;
  at_expiry: string;
  rt_expiry: string;
  otp_expiry_in_minutes: number;
  otp_digits: number;
  iss: string;
  gupshup_userid: string;
  gupshup_pwd: string;
  firebase_api_key: string;
  gupshup_url: string;
  sms_whitelist: string[];
  warehouse_url: string;
  consumer_url: string,
  rz_auth_key: string;
  util_url: string;
  util_token: string;
  client_aws_access_key: string;
  client_aws_secret_key: string;
  default_timeout: number;
}

export default (): Config => {
  const processEnv = process.env as unknown as EnvironmentVariables;
  return {
    appEnv: processEnv.NODE_ENV,
    port: processEnv.PORT || '3000',
    db_url: processEnv.DATABASE_URL,
    at_secret: processEnv.AT_SECRET,
    client_aws_access_key: processEnv.CLIENT_AWS_ACCESS_KEY,
    client_aws_secret_key: processEnv.CLIENT_AWS_SECRET_KEY,
    rt_secret: processEnv.RT_SECRET,
    at_expiry: processEnv.AT_EXPIRY || '60d',
    rt_expiry: processEnv.RT_EXPIRY || '60d',
    otp_expiry_in_minutes: processEnv.OTP_EXPIRY_IN_MINUTES || 5,
    otp_digits: processEnv.OTP_DIGITS || 6,
    iss: processEnv.ISS,
    gupshup_userid: processEnv.GUPSHUP_USERID,
    gupshup_pwd: processEnv.GUPSHUP_PASSWORD,
    gupshup_url: processEnv.GUPSHUP_URL,
    sms_whitelist: JSON.parse(processEnv.SMS_WHITELIST) || ['9876543210'],
    warehouse_url: processEnv.WAREHOUSE_URL,
    rz_auth_key: processEnv.RZ_AUTH_KEY,
    util_url: processEnv.UTIL_URL,
    firebase_api_key: processEnv.FIREBASE_API_KEY,
    util_token: processEnv.UTIL_TOKEN,
    default_timeout:processEnv.DEFAULT_TIMEOUT || 10000,
    consumer_url: processEnv.CONSUMER_URL
  };
};
