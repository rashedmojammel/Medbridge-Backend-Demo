import {
  Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';
import { ConsultationStatus } from '../auth/user-role.enum';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';
import { ChatMessages } from './chat-messages.entity';

@Entity()
export class Consultations {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Patients, { eager: true })
  patient: Patients;

  @ManyToOne(() => Users, { eager: true })
  doctor: Users;

  @ManyToOne(() => Users, { nullable: true })
  scheduledBy: Users; // CHW

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ nullable: true })
  reason: string;

  @Column({ type: 'enum', enum: ConsultationStatus, default: ConsultationStatus.SCHEDULED })
  status: ConsultationStatus;

  @Column({ nullable: true })
  diagnosis: string;

  @Column({ type: 'text', nullable: true })
  doctorNotes: string;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @OneToMany(() => ChatMessages, (m) => m.consultation)
  messages: ChatMessages[];

  @CreateDateColumn()
  createdAt: Date;
}
