import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Between, Repository } from 'typeorm';
import { AppointmentStatus, NotificationType, UserRole } from '../auth/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { Patients } from '../patients/patients.entity';
import { Appointments } from './appointments.entity';
import { CreateAppointmentDto } from './dtos/create-appointment.dto';
import { UpdateAppointmentDto } from './dtos/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointments) private apptRepo: Repository<Appointments>,
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
    private notificationsService: NotificationsService,
  ) {}

  /** FR-8.1 */
  async create(dto: CreateAppointmentDto, createdByUserId: number) {
    const patient = await this.patientsRepo.findOne({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const appt = await this.apptRepo.save(
      this.apptRepo.create({
        patient,
        doctor: { id: dto.doctorId } as any,
        scheduledAt: new Date(dto.scheduledAt),
        type: dto.type ?? 'FOLLOW_UP_CHAT',
        createdBy: { id: createdByUserId } as any,
      }),
    );

    if (patient.user) {
      await this.notificationsService.create(
        patient.user.id, NotificationType.ASSIGNMENT,
        'Follow-up appointment scheduled',
        `On ${dto.scheduledAt}`,
        appt.id,
      );
    }
    return appt;
  }

  /** FR-8 list, role-scoped */
  async findAllFor(user: { id: number; role: UserRole }, filter?: 'upcoming' | 'past') {
    const qb = this.apptRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'p')
      .leftJoinAndSelect('p.user', 'pu')
      .leftJoinAndSelect('a.doctor', 'd');

    if (user.role === UserRole.DOCTOR) qb.where('d.id = :id', { id: user.id });
    else if (user.role === UserRole.PATIENT) qb.where('pu.id = :id', { id: user.id });

    if (filter === 'upcoming') qb.andWhere('a.scheduledAt >= NOW()');
    if (filter === 'past') qb.andWhere('a.scheduledAt < NOW()');

    return qb.orderBy('a.scheduledAt', 'ASC').getMany();
  }

  /** FR-8.2 reschedule/cancel - doctor, CHW who scheduled, or owning patient */
  async update(id: number, dto: UpdateAppointmentDto, user: { id: number; role: UserRole }) {
    const appt = await this.apptRepo.findOne({
      where: { id },
      relations: { patient: { user: true }, doctor: true },
    });
    if (!appt) throw new NotFoundException('Appointment not found');

    const isDoctor = appt.doctor.id === user.id;
    const isOwningPatient = appt.patient.user?.id === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isDoctor && !isOwningPatient && !isAdmin && user.role !== UserRole.CHW)
      throw new ForbiddenException('Not allowed to modify this appointment');

    if (dto.scheduledAt) appt.scheduledAt = new Date(dto.scheduledAt);
    if (dto.status) appt.status = dto.status as AppointmentStatus;
    if (dto.cancelReason) appt.cancelReason = dto.cancelReason;
    return this.apptRepo.save(appt);
  }

  /** FR-8.3 daily reminder cron - at most once per appointment */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendReminders() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = await this.apptRepo.find({
      where: {
        scheduledAt: Between(now, in24h),
        status: AppointmentStatus.SCHEDULED,
        reminderSent: false,
      },
      relations: { patient: { user: true }, doctor: true },
    });

    for (const appt of upcoming) {
      if (appt.patient.user) {
        await this.notificationsService.create(
          appt.patient.user.id, NotificationType.APPOINTMENT_REMINDER,
          'Appointment reminder',
          `With Dr. ${appt.doctor.fullName} tomorrow at ${appt.scheduledAt.toLocaleTimeString()}`,
          appt.id,
        );
      }
      appt.reminderSent = true;
      await this.apptRepo.save(appt);
    }
  }
}
