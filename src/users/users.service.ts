import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { UserRole } from '../auth/user-role.enum';
import { Doctors } from './doctors.entity';
import { HealthWorkers } from './health-workers.entity';
import { Staff } from './staff.entity';
import { Users } from './users.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

/** Fields safe to expose on the public directory - NEVER email/phone/password */
const publicUser = (u: Users) => ({
  id: u.id,
  fullName: u.fullName,
  profileImage: u.profileImage,
});

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users) private usersRepo: Repository<Users>,
    @InjectRepository(Doctors) private doctorsRepo: Repository<Doctors>,
    @InjectRepository(HealthWorkers) private chwRepo: Repository<HealthWorkers>,
    @InjectRepository(Staff) private staffRepo: Repository<Staff>,
    private dataSource: DataSource,
  ) {}

  // ---------- Public directory (FR-2.2) ----------

  async publicDoctors(search?: string, specialization?: string) {
    const all = await this.doctorsRepo.find();
    return all
      .filter((d) => d.user?.isPublic && d.user?.isActive)
      .filter((d) => !search || d.user.fullName.toLowerCase().includes(search.toLowerCase()))
      .filter((d) => !specialization || d.specialization === specialization)
      .map((d) => ({
        ...publicUser(d.user),
        doctorId: d.id,
        specialization: d.specialization,
        qualifications: d.qualifications,
        experienceYears: d.experienceYears,
      }));
  }

  async publicDoctorProfile(id: number) {
    const d = await this.doctorsRepo.findOne({ where: { id } });
    if (!d || !d.user?.isPublic || !d.user?.isActive) throw new NotFoundException('Doctor not found');
    return {
      ...publicUser(d.user),
      doctorId: d.id,
      specialization: d.specialization,
      qualifications: d.qualifications,
      experienceYears: d.experienceYears,
      bio: d.bio,
    };
  }

  async publicChws(search?: string, area?: string) {
    const all = await this.chwRepo.find();
    return all
      .filter((c) => c.user?.isPublic && c.user?.isActive)
      .filter((c) => !search || c.user.fullName.toLowerCase().includes(search.toLowerCase()))
      .filter((c) => !area || c.assignedArea === area)
      .map((c) => ({ ...publicUser(c.user), assignedArea: c.assignedArea, activeSince: c.activeSince }));
  }

  async publicStaff(department?: string) {
    const all = await this.staffRepo.find();
    return all
      .filter((s) => s.user?.isPublic && s.user?.isActive)
      .filter((s) => !department || s.department === department)
      .map((s) => ({ ...publicUser(s.user), department: s.department, designation: s.designation }));
  }

  // ---------- Admin CRUD (FR-2.1) ----------

  async findAll(role?: UserRole, status?: string, search?: string) {
    const qb = this.usersRepo.createQueryBuilder('u');
    if (role) qb.andWhere('u.role = :role', { role });
    if (status === 'active') qb.andWhere('u.isActive = true');
    if (status === 'inactive') qb.andWhere('u.isActive = false');
    if (search) qb.andWhere('(u.fullName ILIKE :s OR u.email ILIKE :s)', { s: `%${search}%` });
    return qb.orderBy('u.createdAt', 'DESC').getMany();
  }

  async findOne(id: number) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    let profile: any = null;
    if (user.role === UserRole.DOCTOR)
      profile = await this.doctorsRepo.findOne({ where: { user: { id } } });
    if (user.role === UserRole.CHW)
      profile = await this.chwRepo.findOne({ where: { user: { id } } });
    if (user.role === UserRole.STAFF || user.role === UserRole.PHARMACIST)
      profile = await this.staffRepo.findOne({ where: { user: { id } } });
    return { user, profile };
  }

  /** Admin creates staff-type accounts. Patients must use /auth/register */
  async createUser(dto: CreateUserDto) {
    if (dto.role === UserRole.PATIENT)
      throw new BadRequestException('Patients register via /auth/register');
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already exists');

    const hashed = await bcrypt.hash(dto.password, 10);

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.save(
        manager.create(Users, {
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          password: hashed,
          role: dto.role,
          isPublic: dto.isPublic ?? false,
        }),
      );

      if (dto.role === UserRole.DOCTOR) {
        await manager.save(
          manager.create(Doctors, {
            user,
            specialization: dto.specialization ?? 'General Medicine',
            qualifications: dto.qualifications,
            experienceYears: dto.experienceYears,
            licenseNumber: dto.licenseNumber,
            bio: dto.bio,
          }),
        );
      } else if (dto.role === UserRole.CHW) {
        await manager.save(manager.create(HealthWorkers, { user, assignedArea: dto.assignedArea }));
      } else {
        // STAFF, PHARMACIST, ADMIN share the Staff profile table
        await manager.save(
          manager.create(Staff, { user, department: dto.department, designation: dto.designation }),
        );
      }
      return user;
    });
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, {
      fullName: dto.fullName ?? user.fullName,
      phone: dto.phone ?? user.phone,
      isPublic: dto.isPublic ?? user.isPublic,
      isActive: dto.isActive ?? user.isActive,
    });
    await this.usersRepo.save(user);

    // update role-specific profile fields if provided
    if (user.role === UserRole.DOCTOR) {
      const prof = await this.doctorsRepo.findOne({ where: { user: { id } } });
      if (prof) {
        Object.assign(prof, {
          specialization: dto.specialization ?? prof.specialization,
          qualifications: dto.qualifications ?? prof.qualifications,
          experienceYears: dto.experienceYears ?? prof.experienceYears,
          licenseNumber: dto.licenseNumber ?? prof.licenseNumber,
          bio: dto.bio ?? prof.bio,
        });
        await this.doctorsRepo.save(prof);
      }
    }
    if (user.role === UserRole.CHW) {
      const prof = await this.chwRepo.findOne({ where: { user: { id } } });
      if (prof && dto.assignedArea) {
        prof.assignedArea = dto.assignedArea;
        await this.chwRepo.save(prof);
      }
    }
    return user;
  }

  async savePhoto(id: number, filename: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.profileImage = `/uploads/${filename}`;
    return this.usersRepo.save(user);
  }
}
