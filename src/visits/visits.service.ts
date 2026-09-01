import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { UserRole, VisitOutcome } from '../auth/user-role.enum';
import { Patients } from '../patients/patients.entity';
import { FieldVisits } from './field-visits.entity';
import { CreateVisitDto } from './dtos/create-visit.dto';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(FieldVisits) private visitsRepo: Repository<FieldVisits>,
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
  ) {}

  async create(dto: CreateVisitDto, chwId: number) {
    const patient = await this.patientsRepo.findOne({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    return this.visitsRepo.save(
      this.visitsRepo.create({
        patient,
        chw: { id: chwId } as any,
        visitDate: dto.visitDate,
        outcome: dto.outcome,
        notes: dto.notes,
        village: dto.village ?? patient.village,
        travelMinutes: dto.travelMinutes,
        followUpNeeded: dto.followUpNeeded ?? false,
      }),
    );
  }

  async findAllFor(
    user: { id: number; role: UserRole },
    filters: { from?: string; to?: string; patientId?: number },
  ) {
    const qb = this.visitsRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.patient', 'p')
      .leftJoinAndSelect('v.chw', 'chw')
      .orderBy('v.visitDate', 'DESC');

    // a CHW sees their own visits; admins see everything
    if (user.role === UserRole.CHW) qb.where('chw.id = :id', { id: user.id });

    if (filters.patientId) qb.andWhere('p.id = :pid', { pid: filters.patientId });
    if (filters.from) qb.andWhere('v.visitDate >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('v.visitDate <= :to', { to: filters.to });

    return qb.take(200).getMany();
  }

  /** Coverage summary a CHW can show for their area. */
  async stats(chwId: number, days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().slice(0, 10);

    const visits = await this.visitsRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.patient', 'p')
      .where('v.chwId = :chwId', { chwId })
      .andWhere('v.visitDate >= :from', { from: fromStr })
      .getMany();

    const byOutcome: Record<string, number> = {};
    const byVillage: Record<string, number> = {};
    let travelTotal = 0;

    visits.forEach((v) => {
      byOutcome[v.outcome] = (byOutcome[v.outcome] ?? 0) + 1;
      const village = v.village ?? v.patient?.village ?? 'Unrecorded';
      byVillage[village] = (byVillage[village] ?? 0) + 1;
      travelTotal += v.travelMinutes ?? 0;
    });

    return {
      days,
      totalVisits: visits.length,
      uniquePatients: new Set(visits.map((v) => v.patient?.id)).size,
      followUpsPending: visits.filter((v) => v.followUpNeeded).length,
      byOutcome,
      byVillage,
      travelMinutes: travelTotal,
    };
  }

  async remove(id: number, user: { id: number; role: UserRole }) {
    const visit = await this.visitsRepo.findOne({
      where: { id },
      relations: { chw: true },
    });
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.chw?.id !== user.id && user.role !== UserRole.ADMIN)
      throw new NotFoundException('Visit not found');
    await this.visitsRepo.remove(visit);
    return { deleted: true };
  }
}
