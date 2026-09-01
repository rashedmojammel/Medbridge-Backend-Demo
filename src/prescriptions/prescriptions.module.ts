import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { MedicineInventory } from '../medicines/medicine-inventory.entity';
import { Patients } from '../patients/patients.entity';
import { DispenseRecords } from './dispense-records.entity';
import { DispensingService } from './dispensing.service';
import { PrescriptionItems } from './prescription-items.entity';
import { Prescriptions } from './prescriptions.entity';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { TreatmentPlans } from './treatment-plans.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Prescriptions,
      PrescriptionItems,
      TreatmentPlans,
      Patients,
      DispenseRecords,
      MedicineInventory,
    ]),
    NotificationsModule,
  ],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, DispensingService],
  exports: [PrescriptionsService, DispensingService],
})
export class PrescriptionsModule {}
