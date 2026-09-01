import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TreatmentPlanStatus } from '../auth/user-role.enum';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';

@Entity()
export class TreatmentPlans {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Patients, { eager: true })
  patient: Patients;

  @ManyToOne(() => Users, { eager: true })
  doctor: Users;

  @Column()
  title: string;

  @Column({ type: 'text' })
  details: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'enum', enum: TreatmentPlanStatus, default: TreatmentPlanStatus.ACTIVE })
  status: TreatmentPlanStatus;

  @CreateDateColumn()
  createdAt: Date;
}
