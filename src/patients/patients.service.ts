import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UserRole } from '../auth/user-role.enum';
import { Patients } from './patients.entity';
import { CreatePatientDto } from './dtos/create-patient.dto';
import { UpdatePatientDto } from './dtos/update-patient.dto';

/**
 * MRN format: P-YYYY-NNNNNN (year + zero-padded sequence).
 * Exported so AuthService can reuse it inside its own registration transaction.
 */
export async function generateMrn(manager: EntityManager): Promise<string> {
  const year = new Date().getFullYear();
  const count = await manager
    .getRepository(Patients)
    .createQueryBuilder('p')
    .where('p.mrn LIKE :prefix', { prefix: `P-${year}-%` })
    .getCount();
  return `P-${year}-${String(count + 1).padStart(6, '0')}`;
}

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
    private dataSource: DataSource,
  ) {}

  /** FR-3.1 CHW registers a patient (no login account) */
  async create(dto: CreatePatientDto, chwUserId: number) {
    return this.dataSource.transaction(async (manager) => {
      const mrn = await generateMrn(manager);
      const patient = manager.create(Patients, {
        ...dto,
        mrn,
        registeredBy: { id: chwUserId } as any,
      });
      return manager.save(patient);
    });
  }

  /** FR-3.2 list/search by MRN, name, phone */
  async findAll(search?: string) {
    const qb = this.patientsRepo.createQueryBuilder('p').leftJoinAndSelect('p.user', 'u');
    if (search) {
      qb.where('p.mrn ILIKE :s OR p.fullName ILIKE :s OR p.phone ILIKE :s', { s: `%${search}%` });
    }
    return qb.orderBy('p.createdAt', 'DESC').getMany();
  }

  /** FR-3.3 detail with ownership check */
  async findOne(id: number, requester: { id: number; role: UserRole }) {
    const patient = await this.patientsRepo.findOne({
      where: { id },
      relations: { registeredBy: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    this.assertCanView(requester, patient);
    return patient;
  }

  /** Role gates the endpoint; ownership gates the row */
  assertCanView(requester: { id: number; role: UserRole }, patient: Patients) {
    if (requester.role === UserRole.PATIENT) {
      if (!patient.user || patient.user.id !== requester.id)
        throw new ForbiddenException('You can only view your own record');
    }
  }

  async findByUserId(userId: number) {
    return this.patientsRepo.findOne({ where: { user: { id: userId } } });
  }

  /** FR-3.4 update - MRN immutable (not in DTO, so whitelist strips it anyway) */
  async update(id: number, dto: UpdatePatientDto) {
    const patient = await this.patientsRepo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    Object.assign(patient, dto);
    return this.patientsRepo.save(patient);
  }
}
