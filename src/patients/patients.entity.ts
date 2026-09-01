import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Users } from '../users/users.entity';

@Entity()
export class Patients {
  @PrimaryGeneratedColumn()
  id: number;

  /** Nullable on purpose: CHW-registered rural patients may have no login account */
  @OneToOne(() => Users, { nullable: true, eager: true })
  @JoinColumn()
  user: Users;

  @Column({ unique: true })
  mrn: string; // P-YYYY-NNNNNN - immutable

  @Column()
  fullName: string;

  @Column({ type: 'date' })
  dob: string;

  @Column()
  gender: string;

  @Column({ nullable: true })
  bloodGroup: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  altPhone: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  village: string;

  @Column({ nullable: true })
  district: string;

  @Column()
  emergencyContactName: string;

  @Column({ nullable: true })
  emergencyContactRelation: string;

  @Column()
  emergencyContactPhone: string;

  @Column({ nullable: true })
  allergies: string;

  @Column({ nullable: true })
  chronicConditions: string;

  @Column({ nullable: true })
  currentMedications: string;

  @ManyToOne(() => Users, { nullable: true })
  registeredBy: Users; // the CHW

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
