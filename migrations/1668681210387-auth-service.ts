import { MigrationInterface, QueryRunner } from 'typeorm';

export class authService1668681210387 implements MigrationInterface {
  name = 'authService1668681210387';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE auth.addresses ALTER COLUMN "type" TYPE varchar USING "type"::varchar
    `);
    await queryRunner.query(`
        ALTER TABLE auth.addresses ALTER COLUMN "type" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses" DROP COLUMN "type"
        `);
    await queryRunner.query(`
            CREATE TYPE "auth"."addresses_type_enum" AS ENUM('Home', 'Work', 'Other')
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses"
            ADD "type" "auth"."addresses_type_enum" NOT NULL DEFAULT 'Other'
        `);
  }
}
