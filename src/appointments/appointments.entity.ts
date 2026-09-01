import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AppointmentStatus } from '../auth/user-role.enum';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';

@Entity()
export class Appointments {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Patients, { eager: true })
  patient: Patients;

  @ManyToOne(() => Users, { eager: true })
  doctor: Users;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ default: 'FOLLOW_UP_CHAT' })
  type: string;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED })
  status: AppointmentStatus;

  @Column({ nullable: true })
  cancelReason: string;

  @ManyToOne(() => Users, { nullable: true })
  createdBy: Users;

  @Column({ default: false })
  reminderSent: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
