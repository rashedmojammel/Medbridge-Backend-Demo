import {
  Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';
import { DispenseStatus, PrescriptionStatus } from '../auth/user-role.enum';
import { Consultations } from '../consultations/consultations.entity';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';
import { PrescriptionItems } from './prescription-items.entity';

/** Immutable once issued - no update endpoint. Only cancel + reissue. */
@Entity()
export class Prescriptions {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Consultations, { nullable: true })
  consultation: Consultations;

  @ManyToOne(() => Patients, { eager: true })
  patient: Patients;

  @ManyToOne(() => Users, { eager: true })
  doctor: Users;

  @Column({ type: 'enum', enum: PrescriptionStatus, default: PrescriptionStatus.ACTIVE })
  status: PrescriptionStatus;

  @Column({ type: 'text', nullable: true })
  doctorNotes: string;

  /** Tracks whether the pharmacy has actually released the medicine. */
  @Column({ type: 'enum', enum: DispenseStatus, default: DispenseStatus.PENDING })
  dispenseStatus: DispenseStatus;

  @Column({ type: 'timestamptz', nullable: true })
  dispensedAt: Date;

  @Column({ nullable: true })
  cancelReason: string;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @OneToMany(() => PrescriptionItems, (i) => i.prescription, { cascade: true, eager: true })
  items: PrescriptionItems[];

  @CreateDateColumn()
  issuedAt: Date;
}
