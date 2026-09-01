import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotificationType, TriageStatus, UserRole } from '../auth/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { Patients } from '../patients/patients.entity';
import { SymptomReports } from './symptom-reports.entity';
import { VitalSigns } from './vital-signs.entity';
import { RecordVitalsDto } from './dtos/record-vitals.dto';
import { SymptomReportDto } from './dtos/symptom-report.dto';

@Injectable()
export class TriageService {
  constructor(
    @InjectRepository(VitalSigns) private vitalsRepo: Repository<VitalSigns>,
    @InjectRepository(SymptomReports) private reportsRepo: Repository<SymptomReports>,
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService,
    private dataSource: DataSource,
  ) {}

  /**
   * FR-4.3 Rule-based triage suggestion. CHW's manual choice stays final;
   * this is decision SUPPORT, not diagnosis.
   */
  suggestTriage(v: { spo2: number; bpSystolic: number; temperature: number; pulse: number }): TriageStatus {
    // thresholds are admin-configurable, so a clinician can adjust them
    // without a code change; defaults match the original hardcoded values
    const t = this.settingsService.triageThresholds();
    if (v.spo2 < t.spo2Critical) return TriageStatus.CRITICAL;
    if (v.bpSystolic > t.systolicHigh || v.bpSystolic < t.systolicLow)
      return TriageStatus.CRITICAL;
    if (v.temperature > t.temperatureCritical) return TriageStatus.CRITICAL;
    if (v.pulse > t.pulseCritical) return TriageStatus.CRITICAL;
    return TriageStatus.NON_CRITICAL;
  }

  private buildWarnings(dto: RecordVitalsDto): string[] {
    const t = this.settingsService.triageThresholds();
    const w: string[] = [];
    if (dto.temperature > t.temperatureWarning) w.push('Temperature above normal');
    if (dto.spo2 < t.spo2Warning) w.push('Oxygen saturation below normal');
    if (dto.bpSystolic > 140 || dto.bpDiastolic > 90) w.push('Blood pressure elevated');
    if (dto.bpSystolic < t.systolicLow) w.push('Blood pressure low');
    if (dto.pulse > t.pulseWarning) w.push('Pulse elevated');
    return w;
  }

  /** FR-4.1 record vitals; response carries warnings + suggestion */
  async recordVitals(dto: RecordVitalsDto, chwUserId: number) {
    const patient = await this.patientsRepo.findOne({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const vitals = await this.vitalsRepo.save(
      this.vitalsRepo.create({
        patient,
        temperature: dto.temperature,
        bpSystolic: dto.bpSystolic,
        bpDiastolic: dto.bpDiastolic,
        pulse: dto.pulse,
        spo2: dto.spo2,
        respiratoryRate: dto.respiratoryRate,
        bloodSugar: dto.bloodSugar,
        recordedBy: { id: chwUserId } as any,
      }),
    );

    return {
      ...vitals,
      warnings: this.buildWarnings(dto),
      suggestedTriage: this.suggestTriage(dto),
    };
  }

  /**
   * FR-4.2 + FR-4.4: report save and (if CRITICAL) emergency alerts
   * happen in the SAME transaction - an alert is never silently lost.
   */
  async submitSymptomReport(dto: SymptomReportDto, chwUserId: number) {
    const patient = await this.patientsRepo.findOne({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    let vitalSign: VitalSigns = null;
    if (dto.vitalSignId) {
      vitalSign = await this.vitalsRepo.findOne({ where: { id: dto.vitalSignId } });
    }

    const suggested = vitalSign ? this.suggestTriage(vitalSign) : null;

    return this.dataSource.transaction(async (manager) => {
      const report = await manager.save(
        manager.create(SymptomReports, {
          patient,
          vitalSign,
          primaryComplaint: dto.primaryComplaint,
          symptoms: dto.symptoms,
          duration: dto.duration,
          severity: dto.severity,
          triageStatus: dto.triageStatus,
          suggestedStatus: suggested,
          notes: dto.notes,
          recordedBy: { id: chwUserId } as any,
        }),
      );

      if (dto.triageStatus === TriageStatus.CRITICAL) {
        const title = 'CRITICAL patient flagged';
        const body = `${patient.fullName} (${patient.mrn}): ${dto.primaryComplaint}`;
        await this.notificationsService.createForRole(
          UserRole.ADMIN, NotificationType.EMERGENCY_ALERT, title, body, patient.id, manager,
        );
        await this.notificationsService.createForRole(
          UserRole.DOCTOR, NotificationType.EMERGENCY_ALERT, title, body, patient.id, manager,
        );
      }
      return report;
    });
  }

  /** FR-4 history */
  async patientHistory(patientId: number) {
    const vitals = await this.vitalsRepo.find({
      where: { patient: { id: patientId } },
      order: { recordedAt: 'DESC' },
    });
    const reports = await this.reportsRepo.find({
      where: { patient: { id: patientId } },
      relations: { vitalSign: true },
      order: { recordedAt: 'DESC' },
    });
    return { vitals, reports };
  }
}
