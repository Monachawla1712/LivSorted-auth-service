import { MigrationInterface, QueryRunner } from 'typeorm';

export class authService1678754838076 implements MigrationInterface {
  name = 'authService1678754838076';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "auth"."roles" (
                "id" SERIAL NOT NULL,
                "name" character varying(150) NOT NULL,
                "level" integer NOT NULL,
                "active" integer NOT NULL DEFAULT '1',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "modified_at" TIMESTAMP NOT NULL DEFAULT now(),
                "modified_by" uuid,
                CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "auth"."privilege_endpoints" (
                "id" SERIAL NOT NULL,
                "method" character varying(50) NOT NULL,
                "uri" character varying(500) NOT NULL,
                "uri_mode" character varying(20) NOT NULL,
                "privilege_slug" character varying(100),
                CONSTRAINT "PK_d31f9c2909ee6c519a8b1e70ea6" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "auth"."role_privileges" (
                "id" SERIAL NOT NULL,
                "role_id" integer NOT NULL,
                "privilege_slug" character varying(100) NOT NULL,
                "active" integer NOT NULL DEFAULT '1',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                "modified_at" TIMESTAMP NOT NULL DEFAULT now(),
                "modified_by" uuid,
                CONSTRAINT "PK_f671486fe8eab3081c087946f2c" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "auth"."role_privileges"
        `);
    await queryRunner.query(`
            DROP TABLE "auth"."privilege_endpoints"
        `);
    await queryRunner.query(`
            DROP TABLE "auth"."roles"
        `);
  }
}
