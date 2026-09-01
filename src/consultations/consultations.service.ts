import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsultationStatus, NotificationType, UserRole } from '../auth/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';
import { ChatMessages } from './chat-messages.entity';
import { Consultations } from './consultations.entity';
import { CreateConsultationDto } from './dtos/create-consultation.dto';
import { SaveDiagnosisDto } from './dtos/save-diagnosis.dto';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectRepository(Consultations) private consultsRepo: Repository<Consultations>,
    @InjectRepository(ChatMessages) private messagesRepo: Repository<ChatMessages>,
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
    @InjectRepository(Users) private usersRepo: Repository<Users>,
    private notificationsService: NotificationsService,
  ) {}

  /** FR-5.1 CHW schedules; doctor + patient notified (ASSIGNMENT) */
  async create(dto: CreateConsultationDto, chwUserId: number) {
    const patient = await this.patientsRepo.findOne({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    const doctor = await this.usersRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor || doctor.role !== UserRole.DOCTOR)
      throw new BadRequestException('doctorId must be a DOCTOR user');

    const consultation = await this.consultsRepo.save(
      this.consultsRepo.create({
        patient,
        doctor,
        scheduledBy: { id: chwUserId } as any,
        scheduledAt: new Date(dto.scheduledAt),
        reason: dto.reason,
      }),
    );

    await this.notificationsService.create(
      doctor.id, NotificationType.ASSIGNMENT,
      'New consultation assigned',
      `${patient.fullName} (${patient.mrn}) on ${dto.scheduledAt}`,
      consultation.id,
    );
    if (patient.user) {
      await this.notificationsService.create(
        patient.user.id, NotificationType.ASSIGNMENT,
        'Consultation scheduled',
        `With Dr. ${doctor.fullName} on ${dto.scheduledAt}`,
        consultation.id,
      );
    }
    return consultation;
  }

  /** FR-5.2 role-scoped list */
  async findAllFor(user: { id: number; role: UserRole }, status?: ConsultationStatus) {
    const qb = this.consultsRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.patient', 'p')
      .leftJoinAndSelect('p.user', 'pu')
      .leftJoinAndSelect('c.doctor', 'd')
      .leftJoinAndSelect('c.scheduledBy', 's');

    if (user.role === UserRole.DOCTOR) qb.where('d.id = :id', { id: user.id });
    else if (user.role === UserRole.PATIENT) qb.where('pu.id = :id', { id: user.id });
    else if (user.role === UserRole.CHW) qb.where('s.id = :id', { id: user.id });
    // ADMIN sees all

    if (status) qb.andWhere('c.status = :status', { status });
    return qb.orderBy('c.scheduledAt', 'DESC').getMany();
  }

  /** FR-5.2 detail incl. full ordered transcript */
  async findOne(id: number, user: { id: number; role: UserRole }) {
    const c = await this.getWithParticipants(id);
    if (user.role !== UserRole.ADMIN) this.assertParticipant(user.id, c);
    const messages = await this.messagesRepo.find({
      where: { consultation: { id } },
      order: { sentAt: 'ASC' },
    });
    return { ...c, messages };
  }

  async getWithParticipants(id: number): Promise<Consultations> {
    const c = await this.consultsRepo.findOne({
      where: { id },
      relations: { patient: { user: true }, doctor: true, scheduledBy: true },
    });
    if (!c) throw new NotFoundException('Consultation not found');
    return c;
  }

  /** Shared by REST + gateway: only doctor, patient, or scheduling CHW belong */
  assertParticipant(userId: number, c: Consultations) {
    const isDoctor = c.doctor?.id === userId;
    const isPatient = c.patient?.user?.id === userId;
    const isChw = c.scheduledBy?.id === userId;
    if (!isDoctor && !isPatient && !isChw)
      throw new ForbiddenException('Not a participant of this consultation');
  }

  /** FR-5.3 persist FIRST, then gateway broadcasts */
  async addMessage(userId: number, consultationId: number, text: string) {
    const c = await this.getWithParticipants(consultationId);
    this.assertParticipant(userId, c);
    if (c.status === ConsultationStatus.COMPLETED || c.status === ConsultationStatus.CANCELLED)
      throw new BadRequestException('Consultation is closed - chat is locked');

    if (c.status === ConsultationStatus.SCHEDULED) {
      c.status = ConsultationStatus.IN_PROGRESS;
      await this.consultsRepo.save(c);
    }

    const saved = await this.messagesRepo.save(
      this.messagesRepo.create({
        consultation: { id: consultationId } as any,
        sender: { id: userId } as any,
        message: text,
      }),
    );
    return this.messagesRepo.findOne({ where: { id: saved.id } });
  }

  /** FR-5.4 */
  async saveDiagnosis(id: number, doctorId: number, dto: SaveDiagnosisDto) {
    const c = await this.getWithParticipants(id);
    if (c.doctor.id !== doctorId) throw new ForbiddenException('Only the assigned doctor');
    c.diagnosis = dto.diagnosis;
    c.doctorNotes = dto.notes ?? c.doctorNotes;
    return this.consultsRepo.save(c);
  }

  /** FR-5.5 lock the chat */
  async complete(id: number, doctorId: number) {
    const c = await this.getWithParticipants(id);
    if (c.doctor.id !== doctorId) throw new ForbiddenException('Only the assigned doctor');
    c.status = ConsultationStatus.COMPLETED;
    c.completedAt = new Date();
    return this.consultsRepo.save(c);
  }
}
