import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Patients } from '../patients/patients.entity';
import { SymptomReports } from './symptom-reports.entity';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';
import { VitalSigns } from './vital-signs.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VitalSigns, SymptomReports, Patients]),
    NotificationsModule,
  ],
  controllers: [TriageController],
  providers: [TriageService],
  exports: [TriageService],
})
export class TriageModule {}
