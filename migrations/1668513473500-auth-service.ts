import { MigrationInterface, QueryRunner } from 'typeorm';

export class authService1668513473500 implements MigrationInterface {
  name = 'authService1668513473500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "auth"."otp_tokens"
            ADD "verification_type" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."otp_tokens"
            ADD "verification_id" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."otp_tokens"
            ALTER COLUMN "otp" DROP NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."otp_tokens"
            ALTER COLUMN "retries_allowed"
            SET DEFAULT '5'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "auth"."otp_tokens"
            ALTER COLUMN "retries_allowed" DROP DEFAULT
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."otp_tokens"
            ALTER COLUMN "otp"
            SET NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."otp_tokens" DROP COLUMN "verification_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."otp_tokens" DROP COLUMN "verification_type"
        `);
  }
}
