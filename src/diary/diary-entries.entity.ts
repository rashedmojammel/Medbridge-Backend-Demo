import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DiaryMood } from '../auth/user-role.enum';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';

/**
 * Patient self-reporting between consultations. A doctor only sees the patient
 * on consultation days; this fills the gap in between, and gives the next
 * consultation something concrete to open with.
 */
@Entity()
export class DiaryEntries {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Patients, { onDelete: 'CASCADE' })
  patient: Patients;

  @ManyToOne(() => Users, { nullable: true })
  recordedBy: Users; // the patient, or a CHW entering it for them

  @Column({ type: 'text' })
  note: string;

  @Column('simple-array', { nullable: true })
  symptoms: string[];

  @Column({ type: 'enum', enum: DiaryMood, default: DiaryMood.SAME })
  mood: DiaryMood;

  @Column({ type: 'int', nullable: true })
  painLevel: number; // 0-10

  @Column({ default: false })
  medicationTaken: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
