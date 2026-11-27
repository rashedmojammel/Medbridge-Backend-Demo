import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderFulfillment1790531955810 implements MigrationInterface {
    name = 'AddOrderFulfillment1790531955810'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."orders_fulfillmentstatus_enum" AS ENUM('UNFULFILLED', 'FULFILLED')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "fulfillmentStatus" "public"."orders_fulfillmentstatus_enum" NOT NULL DEFAULT 'UNFULFILLED'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "fulfilledAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "fulfilledById" integer`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_36ec9f232418b296babeefc45f3" FOREIGN KEY ("fulfilledById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_36ec9f232418b296babeefc45f3"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "fulfilledById"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "fulfilledAt"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "fulfillmentStatus"`);
        await queryRunner.query(`DROP TYPE "public"."orders_fulfillmentstatus_enum"`);
    }

}
