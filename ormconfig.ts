import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { UserEntity } from './src/user/user.entity';
import { OtpTokensEntity } from './src/auth/otp-tokens.entity';
import { RefreshTokenEntity } from './src/auth/refresh-token.entity';
import { DevicesEntity } from './src/user/devices.entity';
import { UserAddressEntity } from './src/user_address/user_address.entity';
import { UserStoreMappingEntity } from './src/user_store/user-store-mapping.entity';
import { ParamsEntity } from './src/user_params/params.entity';
import { UserAppsEntity } from './src/user/user-apps.entity';
import { RolesEntity } from './src/privilege/entity/roles.entity';
import { RolePrivilegesEntity } from './src/privilege/entity/role-privileges.entity';
import { PrivilegeEndpointsEntity } from './src/privilege/entity/privilege-endpoints.entity';
import { BulkUploadEntity } from './src/core/common/bulk-upload.entity';
import { UserManagerMappingEntity } from './src/user_manager/user-manager-mapping.entity';
import { AmStoreMappingEntity } from './src/user_store/am-store-mapping.entity';
import { EligibleOffersEntity } from 'src/user_offers/user-eligible-offers.entity';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  url: configService.get('DATABASE_URL'),
  entities: [
    UserAddressEntity,
    UserEntity,
    OtpTokensEntity,
    RefreshTokenEntity,
    DevicesEntity,
    UserStoreMappingEntity,
    ParamsEntity,
    UserAppsEntity,
    RolesEntity,
    RolePrivilegesEntity,
    PrivilegeEndpointsEntity,
    BulkUploadEntity,
    AmStoreMappingEntity,
    UserManagerMappingEntity,
    EligibleOffersEntity,
  ],
  migrations: ['migrations/*'],
  migrationsTableName: 'auth.auth_migration',
});
