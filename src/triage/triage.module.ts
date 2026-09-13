import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';
import { SymptomReports } from './symptom-reports.entity';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';
import { VitalSigns } from './vital-signs.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VitalSigns, SymptomReports, Patients, Users]),
    NotificationsModule,
    MailModule,
  ],
  controllers: [TriageController],
  providers: [TriageService],
  exports: [TriageService],
})
export class TriageModule {}