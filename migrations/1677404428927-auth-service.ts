import { MigrationInterface, QueryRunner } from 'typeorm';

export class authService1677404428927 implements MigrationInterface {
  name = 'authService1677404428927';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "auth"."params" (
                "id" SERIAL NOT NULL,
                "param_key" character varying NOT NULL,
                "param_name" character varying NOT NULL,
                "param_value" character varying NOT NULL,
                "active" integer NOT NULL,
                "is_editable" integer NOT NULL,
                "is_public" integer NOT NULL,
                CONSTRAINT "PK_54f49c25753910452dedc4df0f0" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "auth"."user_apps" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "device_id" character varying NOT NULL,
                "package_name" character varying(100) NOT NULL,
                "platform_name" character varying(100) NOT NULL,
                "app_name" character varying(100) NOT NULL,
                "active" integer NOT NULL DEFAULT '1',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "modified_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid NOT NULL,
                "modified_by" uuid NOT NULL,
                CONSTRAINT "UQ_1962cc792299505a835f3c48d3a" UNIQUE ("user_id", "device_id", "package_name"),
                CONSTRAINT "PK_fc0f4f1c464efb7357f6869c15c" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "auth"."user_apps"
        `);
    await queryRunner.query(`
            DROP TABLE "auth"."params"
        `);
  }
}
