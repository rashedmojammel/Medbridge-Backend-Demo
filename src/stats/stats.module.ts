import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consultations } from '../consultations/consultations.entity';
import { MedicineInventory } from '../medicines/medicine-inventory.entity';
import { Medicines } from '../medicines/medicines.entity';
import { Patients } from '../patients/patients.entity';
import { Prescriptions } from '../prescriptions/prescriptions.entity';
import { SymptomReports } from '../triage/symptom-reports.entity';
import { Users } from '../users/users.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Users,
      Patients,
      Consultations,
      Prescriptions,
      Medicines,
      MedicineInventory,
      SymptomReports,
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
