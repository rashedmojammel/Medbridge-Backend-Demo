import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMedicineImageUrl1790067295635 implements MigrationInterface {
    name = 'AddMedicineImageUrl1790067295635'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medicines" ADD "imageUrl" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medicines" DROP COLUMN "imageUrl"`);
    }

}
