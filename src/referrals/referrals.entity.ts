import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReferralStatus, ReferralUrgency } from '../auth/user-role.enum';
import { Consultations } from '../consultations/consultations.entity';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';

/**
 * The escape hatch out of remote care. Chat consultation cannot handle a
 * fracture, a delivery, or anything needing hands. A referral records the
 * decision to send a patient to a physical facility and keeps it on the
 * patient's record instead of it happening informally over a phone call.
 */
@Entity()
export class Referrals {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Patients, { eager: true })
  patient: Patients;

  @ManyToOne(() => Users, { eager: true })
  referredBy: Users; // doctor or CHW

  @ManyToOne(() => Consultations, { nullable: true })
  consultation: Consultations;

  @Column()
  facilityName: string;

  @Column({ nullable: true })
  facilityType: string; // UPAZILA_HEALTH_COMPLEX | DISTRICT_HOSPITAL | MEDICAL_COLLEGE | PRIVATE

  @Column({ nullable: true })
  department: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'text', nullable: true })
  clinicalSummary: string;

  @Column({ type: 'enum', enum: ReferralUrgency, default: ReferralUrgency.ROUTINE })
  urgency: ReferralUrgency;

  @Column({ type: 'enum', enum: ReferralStatus, default: ReferralStatus.PENDING })
  status: ReferralStatus;

  @Column({ type: 'text', nullable: true })
  outcome: string; // filled in when the referral is closed

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
