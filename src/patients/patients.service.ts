// import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { DataSource, EntityManager, Repository } from 'typeorm';
// import { UserRole } from '../auth/user-role.enum';
// import { Patients } from './patients.entity';
// import { CreatePatientDto } from './dtos/create-patient.dto';
// import { UpdatePatientDto } from './dtos/update-patient.dto';

// /**
//  * MRN format: P-YYYY-NNNNNN (year + zero-padded sequence).
//  * Exported so AuthService can reuse it inside its own registration transaction.
//  */
// export async function generateMrn(manager: EntityManager): Promise<string> {
//   const year = new Date().getFullYear();
//   const count = await manager
//     .getRepository(Patients)
//     .createQueryBuilder('p')
//     .where('p.mrn LIKE :prefix', { prefix: `P-${year}-%` })
//     .getCount();
//   return `P-${year}-${String(count + 1).padStart(6, '0')}`;
// }

// @Injectable()
// export class PatientsService {
//   constructor(
//     @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
//     private dataSource: DataSource,
//   ) {}

//   /** FR-3.1 CHW registers a patient (no login account) */
//   async create(dto: CreatePatientDto, chwUserId: number) {
//     return this.dataSource.transaction(async (manager) => {
//       const mrn = await generateMrn(manager);
//       const patient = manager.create(Patients, {
//         ...dto,
//         mrn,
//         registeredBy: { id: chwUserId } as any,
//       });
//       return manager.save(patient);
//     });
//   }

//   /** FR-3.2 list/search by MRN, name, phone */
//   async findAll(search?: string) {
//     const qb = this.patientsRepo.createQueryBuilder('p').leftJoinAndSelect('p.user', 'u');
//     if (search) {
//       qb.where('p.mrn ILIKE :s OR p.fullName ILIKE :s OR p.phone ILIKE :s', { s: `%${search}%` });
//     }
//     return qb.orderBy('p.createdAt', 'DESC').getMany();
//   }

//   /** FR-3.3 detail with ownership check */
//   async findOne(id: number, requester: { id: number; role: UserRole }) {
//     const patient = await this.patientsRepo.findOne({
//       where: { id },
//       relations: { registeredBy: true },
//     });
//     if (!patient) throw new NotFoundException('Patient not found');
//     this.assertCanView(requester, patient);
//     return patient;
//   }

//   /** Role gates the endpoint; ownership gates the row */
//   assertCanView(requester: { id: number; role: UserRole }, patient: Patients) {
//     if (requester.role === UserRole.PATIENT) {
//       if (!patient.user || patient.user.id !== requester.id)
//         throw new ForbiddenException('You can only view your own record');
//     }
//   }

//   async findByUserId(userId: number) {
//     return this.patientsRepo.findOne({ where: { user: { id: userId } } });
//   }

//   /** FR-3.4 update - MRN immutable (not in DTO, so whitelist strips it anyway) */
//   async update(id: number, dto: UpdatePatientDto) {
//     const patient = await this.patientsRepo.findOne({ where: { id } });
//     if (!patient) throw new NotFoundException('Patient not found');
//     Object.assign(patient, dto);
//     return this.patientsRepo.save(patient);
//   }
// }

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRole } from '../auth/user-role.enum';
import { Users } from '../users/users.entity';
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

/** e.g. "p-2026-000016@patient.medbridge.local" - unique because the MRN is. */
function generatePatientEmail(mrn: string): string {
  return `${mrn.toLowerCase()}@patient.medbridge.local`;
}

/** 10-character temp password the CHW reads out to the patient. */
function generateTempPassword(): string {
  return crypto.randomBytes(5).toString('hex');
}

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
    private dataSource: DataSource,
  ) {}

  /** FR-3.1 CHW registers a patient - now also creates a login account. */
  async create(dto: CreatePatientDto, chwUserId: number) {
    return this.dataSource.transaction(async (manager) => {
      const mrn = await generateMrn(manager);

      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const email = generatePatientEmail(mrn);

      const user = manager.create(Users, {
        fullName: dto.fullName,
        email,
        phone: dto.phone,
        password: hashedPassword,
        role: UserRole.PATIENT,
        isActive: true,
      });
      const savedUser = await manager.save(user);

      const patient = manager.create(Patients, {
        ...dto,
        mrn,
        user: savedUser,
        registeredBy: { id: chwUserId } as any,
      });
      const savedPatient = await manager.save(patient);

      // Returned once, here - the CHW reads this to the patient on the spot.
      // It is never stored anywhere in plain text and cannot be retrieved again.
      return {
        patient: savedPatient,
        credentials: { email, tempPassword },
      };
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