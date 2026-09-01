import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VisitOutcome } from '../auth/user-role.enum';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';

/**
 * A CHW's home visit, recorded whether or not a triage happened. Plenty of
 * visits end with "patient not home" or "doing fine" - those still count as
 * coverage and currently leave no trace in the system at all.
 */
@Entity()
export class FieldVisits {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Patients, { eager: true, onDelete: 'CASCADE' })
  patient: Patients;

  @ManyToOne(() => Users, { eager: true })
  chw: Users;

  @Column({ type: 'date' })
  visitDate: string;

  @Column({ type: 'enum', enum: VisitOutcome })
  outcome: VisitOutcome;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  village: string;

  @Column({ type: 'int', nullable: true })
  travelMinutes: number;

  @Column({ default: false })
  followUpNeeded: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
