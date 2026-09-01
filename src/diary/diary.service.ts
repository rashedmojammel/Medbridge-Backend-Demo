import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiaryMood, UserRole } from '../auth/user-role.enum';
import { Patients } from '../patients/patients.entity';
import { DiaryEntries } from './diary-entries.entity';
import { CreateDiaryEntryDto } from './dtos/create-diary-entry.dto';

@Injectable()
export class DiaryService {
  constructor(
    @InjectRepository(DiaryEntries) private diaryRepo: Repository<DiaryEntries>,
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
  ) {}

  /** Resolves which patient record the caller is allowed to write against. */
  private async resolvePatient(
    user: { id: number; role: UserRole },
    patientId?: number,
  ): Promise<Patients> {
    if (user.role === UserRole.PATIENT) {
      const own = await this.patientsRepo.findOne({
        where: { user: { id: user.id } },
      });
      if (!own) throw new NotFoundException('No patient record linked to your account');
      return own;
    }

    if (!patientId)
      throw new ForbiddenException('patientId is required when recording for someone else');

    const patient = await this.patientsRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async create(dto: CreateDiaryEntryDto, user: { id: number; role: UserRole }) {
    const patient = await this.resolvePatient(user, dto.patientId);

    return this.diaryRepo.save(
      this.diaryRepo.create({
        patient,
        recordedBy: { id: user.id } as any,
        note: dto.note,
        symptoms: dto.symptoms ?? [],
        mood: dto.mood,
        painLevel: dto.painLevel,
        medicationTaken: dto.medicationTaken ?? false,
      }),
    );
  }

  async findMine(user: { id: number; role: UserRole }) {
    const patient = await this.resolvePatient(user);
    return this.diaryRepo.find({
      where: { patient: { id: patient.id } },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findForPatient(patientId: number) {
    return this.diaryRepo.find({
      where: { patient: { id: patientId } },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Small summary a doctor can glance at before a consultation: how the
   * patient reported feeling, and whether they took their medicine.
   */
  async summaryForPatient(patientId: number, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const entries = await this.diaryRepo
      .createQueryBuilder('d')
      .where('d.patientId = :patientId', { patientId })
      .andWhere('d.createdAt >= :since', { since })
      .orderBy('d.createdAt', 'DESC')
      .getMany();

    const moodCounts = { BETTER: 0, SAME: 0, WORSE: 0 };
    let painTotal = 0;
    let painSamples = 0;
    let adherent = 0;

    entries.forEach((e) => {
      moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1;
      if (e.painLevel != null) {
        painTotal += e.painLevel;
        painSamples += 1;
      }
      if (e.medicationTaken) adherent += 1;
    });

    return {
      days,
      entryCount: entries.length,
      moodCounts,
      averagePain: painSamples ? Number((painTotal / painSamples).toFixed(1)) : null,
      adherenceRate: entries.length
        ? Math.round((adherent / entries.length) * 100)
        : null,
      latest: entries[0] ?? null,
    };
  }

  async remove(id: number, user: { id: number; role: UserRole }) {
    const entry = await this.diaryRepo.findOne({
      where: { id },
      relations: { patient: { user: true } },
    });
    if (!entry) throw new NotFoundException('Diary entry not found');

    const isOwner = entry.patient?.user?.id === user.id;
    if (!isOwner && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('You can only delete your own diary entries');

    await this.diaryRepo.remove(entry);
    return { deleted: true };
  }
}
