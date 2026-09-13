import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotificationType, TriageStatus, UserRole } from '../auth/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { MailService } from '../mail/mail.service';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';
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
    @InjectRepository(Users) private usersRepo: Repository<Users>,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService,
    private mailService: MailService,
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
   * Email is sent AFTER the transaction commits, so a slow/failed SMTP
   * send can never hold the database transaction open or roll it back.
   */
  async submitSymptomReport(dto: SymptomReportDto, chwUserId: number) {
    const patient = await this.patientsRepo.findOne({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    let vitalSign: VitalSigns = null;
    if (dto.vitalSignId) {
      vitalSign = await this.vitalsRepo.findOne({ where: { id: dto.vitalSignId } });
    }

    const suggested = vitalSign ? this.suggestTriage(vitalSign) : null;

    const report = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(
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
      return saved;
    });

    if (dto.triageStatus === TriageStatus.CRITICAL) {
      await this.emailCriticalAlert(patient, dto);
    }

    return report;
  }

  /** Emails every active doctor when a report comes back CRITICAL. */
  private async emailCriticalAlert(patient: Patients, dto: SymptomReportDto) {
    const doctors = await this.usersRepo.find({
      where: { role: UserRole.DOCTOR, isActive: true },
    });
    const emails = doctors.map((d) => d.email).filter(Boolean);
    if (emails.length === 0) return;

    const subject = `CRITICAL: ${patient.fullName} (${patient.mrn})`;
    const html = this.buildCriticalAlertEmail(patient, dto);
    await this.mailService.send(emails, subject, html);
  }

  /**
   * Table-based layout with inline styles throughout - email clients
   * (Outlook in particular) strip <style> blocks and don't support
   * flexbox/grid, so every rule that matters has to live on the element.
   */
  private buildCriticalAlertEmail(patient: Patients, dto: SymptomReportDto): string {
    const appUrl = process.env.APP_URL ?? '#';
    const symptomsList = dto.symptoms.length
      ? dto.symptoms.map((s) => this.escapeHtml(s)).join(', ')
      : 'None reported';

    const detailRow = (label: string, value: string) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#64748b;width:140px;vertical-align:top;">
          ${label}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;vertical-align:top;">
          ${value}
        </td>
      </tr>`;

    return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f1f5f9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">

            <!-- Header -->
            <tr>
              <td style="background-color:#2563eb;padding:20px 28px;">
                <span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">
                  Medbridge
                </span>
              </td>
            </tr>

            <!-- Alert banner -->
            <tr>
              <td style="background-color:#fef2f2;border-bottom:1px solid #fecaca;padding:16px 28px;">
                <span style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#dc2626;">
                  &#9888; Critical Patient Flagged
                </span>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#334155;">
                  A community health worker has flagged the following patient as <strong>CRITICAL</strong> during a symptom report. Please review as soon as possible.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${detailRow('Patient', `${this.escapeHtml(patient.fullName)} &middot; MRN ${this.escapeHtml(patient.mrn)}`)}
                  ${detailRow('Primary complaint', this.escapeHtml(dto.primaryComplaint))}
                  ${detailRow('Symptoms', symptomsList)}
                  ${detailRow('Duration', this.escapeHtml(String(dto.duration ?? 'Not specified')))}
                  ${detailRow('Severity', this.escapeHtml(String(dto.severity ?? 'Not specified')))}
                  ${dto.notes ? detailRow('Notes', this.escapeHtml(dto.notes)) : ''}
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    <td style="border-radius:6px;background-color:#2563eb;">
                      <a href="${appUrl}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">
                        Review Full Record
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 28px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;">
                  This is an automated alert sent by Medbridge triage. Please do not reply directly to this email.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  /** Minimal HTML-escaping for values interpolated into the email template. */
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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