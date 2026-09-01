import {
  ConflictException, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { Patients } from '../patients/patients.entity';
import { generateMrn } from '../patients/patients.service';
import { Users } from '../users/users.entity';
import { UserRole } from './user-role.enum';
import { LoginDto } from './dtos/login.dto';
import { RegisterPatientDto } from './dtos/register-patient.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users) private usersRepo: Repository<Users>,
    private jwtService: JwtService,
    private dataSource: DataSource,
  ) {}

  /** FR-1.1 Patient self-registration: user + patient row + MRN in ONE transaction */
  async registerPatient(dto: RegisterPatientDto) {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.dataSource.transaction(async (manager) => {
      const newUser = manager.create(Users, {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        password: hashed,
        role: UserRole.PATIENT,
      });
      const savedUser = await manager.save(newUser);

      const mrn = await generateMrn(manager);
      const patient = manager.create(Patients, {
        user: savedUser,
        fullName: dto.fullName,
        mrn,
        dob: dto.dob,
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        phone: dto.phone,
        address: dto.address,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
      });
      await manager.save(patient);
      return savedUser;
    });

    return this.buildToken(user);
  }

  /** FR-1.2 Login by EMAIL. Generic error message - no user-existence leak */
  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.buildToken(user);
  }

  private buildToken(user: Users) {
    const payload = { sub: user.id, email: user.email, role: user.role, name: user.fullName };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    };
  }
}
