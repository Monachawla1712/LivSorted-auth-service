import { MigrationInterface, QueryRunner } from 'typeorm';

export class authService1673527681429 implements MigrationInterface {
  name = 'authService1673527681429';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses"
            ADD "floor" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses"
            ADD "house" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses"
            ADD "street" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses"
            ADD "society" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses"
            ADD "sector" character varying
        `);
    await queryRunner.query(`
            update auth.addresses set
            house = address_line_1,
            street = address_line_2,
            society = landmark,
            sector = city;
        `);
    await queryRunner.query(`
            alter table auth.addresses
            alter column house set not null;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses" DROP COLUMN "sector"
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses" DROP COLUMN "society"
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses" DROP COLUMN "street"
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses" DROP COLUMN "house"
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."addresses" DROP COLUMN "floor"
        `);
  }
}
