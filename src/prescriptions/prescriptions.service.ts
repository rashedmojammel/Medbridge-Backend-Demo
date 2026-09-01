import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotificationType, PrescriptionStatus, UserRole } from '../auth/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { Patients } from '../patients/patients.entity';
import { PrescriptionItems } from './prescription-items.entity';
import { Prescriptions } from './prescriptions.entity';
import { TreatmentPlans } from './treatment-plans.entity';
import { CreatePrescriptionDto } from './dtos/create-prescription.dto';
import { CreateTreatmentPlanDto } from './dtos/create-treatment-plan.dto';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescriptions) private rxRepo: Repository<Prescriptions>,
    @InjectRepository(TreatmentPlans) private plansRepo: Repository<TreatmentPlans>,
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  /** FR-6.1 prescription + items in ONE transaction, then notify patient */
  async create(dto: CreatePrescriptionDto, doctorId: number) {
    const patient = await this.patientsRepo.findOne({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const prescription = await this.dataSource.transaction(async (manager) => {
      const rx = manager.create(Prescriptions, {
        consultation: dto.consultationId ? ({ id: dto.consultationId } as any) : null,
        patient,
        doctor: { id: doctorId } as any,
        doctorNotes: dto.notes,
      });
      const savedRx = await manager.save(rx);

      const items = dto.items.map((i) =>
        manager.create(PrescriptionItems, {
          prescription: savedRx,
          medicine: { id: i.medicineId } as any,
          dosage: i.dosage,
          frequency: i.frequency,
          duration: i.duration,
          route: i.route ?? 'ORAL',
          instructions: i.instructions,
        }),
      );
      await manager.save(items);
      return savedRx;
    });

    if (patient.user) {
      await this.notificationsService.create(
        patient.user.id, NotificationType.PRESCRIPTION_READY,
        'New prescription ready',
        `Prescription #${prescription.id} from your doctor is ready`,
        prescription.id,
      );
    }
    return this.findOne(prescription.id, { id: doctorId, role: UserRole.DOCTOR });
  }

  /** FR-6.3 role-scoped list */
  async findAllFor(user: { id: number; role: UserRole }) {
    const qb = this.rxRepo
      .createQueryBuilder('rx')
      .leftJoinAndSelect('rx.patient', 'p')
      .leftJoinAndSelect('p.user', 'pu')
      .leftJoinAndSelect('rx.doctor', 'd')
      .leftJoinAndSelect('rx.items', 'items')
      .leftJoinAndSelect('items.medicine', 'med');

    if (user.role === UserRole.DOCTOR) qb.where('d.id = :id', { id: user.id });
    else if (user.role === UserRole.PATIENT) qb.where('pu.id = :id', { id: user.id });

    return qb.orderBy('rx.issuedAt', 'DESC').getMany();
  }

  async findOne(id: number, user: { id: number; role: UserRole }) {
    const rx = await this.rxRepo.findOne({
      where: { id },
      relations: { patient: { user: true }, doctor: true, items: { medicine: true } },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    if (user.role === UserRole.PATIENT && rx.patient.user?.id !== user.id)
      throw new ForbiddenException('Not your prescription');
    if (user.role === UserRole.DOCTOR && rx.doctor.id !== user.id)
      throw new ForbiddenException('Not your prescription');
    return rx;
  }

  /** FR-6.2 IMMUTABLE - cancel only, issuing doctor only */
  async cancel(id: number, doctorId: number, reason: string) {
    const rx = await this.rxRepo.findOne({ where: { id }, relations: { doctor: true } });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.doctor.id !== doctorId) throw new ForbiddenException('Only the issuing doctor can cancel');
    if (rx.status === PrescriptionStatus.CANCELLED)
      throw new BadRequestException('Already cancelled');

    rx.status = PrescriptionStatus.CANCELLED;
    rx.cancelReason = reason;
    rx.cancelledAt = new Date();
    return this.rxRepo.save(rx);
  }

  /** FR-6.4 treatment plans */
  async createPlan(dto: CreateTreatmentPlanDto, doctorId: number) {
    const patient = await this.patientsRepo.findOne({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    return this.plansRepo.save(
      this.plansRepo.create({ ...dto, patient, doctor: { id: doctorId } as any }),
    );
  }

  async plansForPatient(patientId: number, user: { id: number; role: UserRole }) {
    if (user.role === UserRole.PATIENT) {
      const patient = await this.patientsRepo.findOne({
        where: { id: patientId },
        relations: { user: true },
      });
      if (!patient || patient.user?.id !== user.id)
        throw new ForbiddenException('Not your treatment plan');
    }
    return this.plansRepo.find({
      where: { patient: { id: patientId } },
      order: { createdAt: 'DESC' },
    });
  }
}
