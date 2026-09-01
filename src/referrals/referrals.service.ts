import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAction,
  NotificationType,
  ReferralStatus,
  ReferralUrgency,
  UserRole,
} from '../auth/user-role.enum';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Patients } from '../patients/patients.entity';
import { Referrals } from './referrals.entity';
import { CreateReferralDto } from './dtos/create-referral.dto';
import { UpdateReferralDto } from './dtos/update-referral.dto';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referrals) private referralsRepo: Repository<Referrals>,
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  async create(
    dto: CreateReferralDto,
    actor: { id: number; email?: string; role?: string },
  ) {
    const patient = await this.patientsRepo.findOne({
      where: { id: dto.patientId },
      relations: { user: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const referral = await this.referralsRepo.save(
      this.referralsRepo.create({
        patient,
        referredBy: { id: actor.id } as any,
        consultation: dto.consultationId ? ({ id: dto.consultationId } as any) : null,
        facilityName: dto.facilityName,
        facilityType: dto.facilityType,
        department: dto.department,
        reason: dto.reason,
        clinicalSummary: dto.clinicalSummary,
        urgency: dto.urgency,
      }),
    );

    // an emergency referral should reach admins the same way a critical
    // triage does, rather than sitting in a list nobody is watching
    if (dto.urgency === ReferralUrgency.EMERGENCY) {
      await this.notificationsService.createForRole(
        UserRole.ADMIN,
        NotificationType.EMERGENCY_ALERT,
        'Emergency referral raised',
        `${patient.fullName} (${patient.mrn}) referred to ${dto.facilityName}: ${dto.reason}`,
        referral.id,
      );
    }

    if (patient.user) {
      await this.notificationsService.create(
        patient.user.id,
        NotificationType.ASSIGNMENT,
        'You have been referred',
        `Referred to ${dto.facilityName}. Reason: ${dto.reason}`,
        referral.id,
      );
    }

    this.auditService.record({
      actor,
      action: AuditAction.CREATE,
      resource: 'referrals',
      resourceId: referral.id,
      detail: `${dto.urgency} referral to ${dto.facilityName}`,
    });

    return referral;
  }

  async findAllFor(user: { id: number; role: UserRole }, status?: ReferralStatus) {
    const qb = this.referralsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.patient', 'p')
      .leftJoinAndSelect('p.user', 'pu')
      .leftJoinAndSelect('r.referredBy', 'rb')
      .orderBy('r.createdAt', 'DESC');

    // doctors and CHWs see what they raised; patients see their own
    if (user.role === UserRole.DOCTOR || user.role === UserRole.CHW) {
      qb.where('rb.id = :id', { id: user.id });
    } else if (user.role === UserRole.PATIENT) {
      qb.where('pu.id = :id', { id: user.id });
    }

    if (status) qb.andWhere('r.status = :status', { status });
    return qb.getMany();
  }

  async findForPatient(patientId: number) {
    return this.referralsRepo.find({
      where: { patient: { id: patientId } },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: number,
    dto: UpdateReferralDto,
    actor: { id: number; email?: string; role?: string },
  ) {
    const referral = await this.referralsRepo.findOne({
      where: { id },
      relations: { referredBy: true },
    });
    if (!referral) throw new NotFoundException('Referral not found');

    const isOwner = referral.referredBy?.id === actor.id;
    if (!isOwner && actor.role !== UserRole.ADMIN)
      throw new ForbiddenException('Only the referring clinician or an admin can update this');

    if (dto.status) referral.status = dto.status;
    if (dto.outcome) referral.outcome = dto.outcome;

    const saved = await this.referralsRepo.save(referral);

    this.auditService.record({
      actor,
      action: AuditAction.UPDATE,
      resource: 'referrals',
      resourceId: id,
      detail: `status -> ${referral.status}`,
    });

    return saved;
  }
}
