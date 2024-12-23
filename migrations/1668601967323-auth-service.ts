import { MigrationInterface, QueryRunner } from 'typeorm';

export class authService1668601967323 implements MigrationInterface {
  name = 'authService1668601967323';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "auth"."otp_tokens"
            ADD "is_active" boolean NOT NULL DEFAULT false
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "auth"."otp_tokens" DROP COLUMN "is_active"
        `);
  }
}
