import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TriageStatus } from '../auth/user-role.enum';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';
import { VitalSigns } from './vital-signs.entity';

@Entity()
export class SymptomReports {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Patients, { eager: true })
  patient: Patients;

  @OneToOne(() => VitalSigns, { nullable: true })
  @JoinColumn()
  vitalSign: VitalSigns;

  @Column()
  primaryComplaint: string;

  @Column('simple-array')
  symptoms: string[];

  @Column({ nullable: true })
  duration: string;

  @Column()
  severity: string; // MILD | MODERATE | SEVERE

  @Column({ type: 'enum', enum: TriageStatus })
  triageStatus: TriageStatus; // CHW's final decision

  @Column({ type: 'enum', enum: TriageStatus, nullable: true })
  suggestedStatus: TriageStatus; // rule-based suggestion, stored for audit

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Users)
  recordedBy: Users;

  @CreateDateColumn()
  recordedAt: Date;
}
