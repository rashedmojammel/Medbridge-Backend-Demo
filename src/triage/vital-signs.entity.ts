import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';

@Entity()
export class VitalSigns {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Patients, { eager: true })
  patient: Patients;

  @Column({ type: 'float' })
  temperature: number; // Celsius

  @Column()
  bpSystolic: number;

  @Column()
  bpDiastolic: number;

  @Column()
  pulse: number;

  @Column()
  spo2: number;

  @Column({ nullable: true })
  respiratoryRate: number;

  @Column({ nullable: true })
  bloodSugar: number;

  @ManyToOne(() => Users)
  recordedBy: Users; // CHW

  @CreateDateColumn()
  recordedAt: Date;
}
