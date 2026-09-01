import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { TriageModule } from './triage/triage.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { MedicinesModule } from './medicines/medicines.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { ReferralsModule } from './referrals/referrals.module';
import { AvailabilityModule } from './availability/availability.module';
import { TemplatesModule } from './templates/templates.module';
import { DiaryModule } from './diary/diary.module';
import { VisitsModule } from './visits/visits.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USER', 'postgres'),
        password: config.get('DATABASE_PASSWORD'),
        database: config.get('DATABASE_NAME', 'medbridge'),
        autoLoadEntities: true,
        synchronize: true, // dev only - use migrations in production
      }),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    PatientsModule,
    TriageModule,
    ConsultationsModule,
    PrescriptionsModule,
    MedicinesModule,
    AppointmentsModule,
    NotificationsModule,
    // global cross-cutting modules first
    AuditModule,
    SettingsModule,
    // new feature modules
    ReferralsModule,
    AvailabilityModule,
    TemplatesModule,
    DiaryModule,
    VisitsModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
