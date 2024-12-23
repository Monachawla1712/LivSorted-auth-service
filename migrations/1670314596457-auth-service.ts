import { MigrationInterface, QueryRunner } from 'typeorm';

export class authService1670314596457 implements MigrationInterface {
  name = 'authService1670314596457';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE auth.user_store_mapping ALTER COLUMN store_id TYPE varchar USING store_id::varchar;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "auth"."user_store_mapping" DROP COLUMN "store_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "auth"."user_store_mapping"
            ADD "store_id" integer NOT NULL
        `);
  }
}
