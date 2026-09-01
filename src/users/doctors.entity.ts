import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from './users.entity';

@Entity()
export class Doctors {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Users, { eager: true })
  @JoinColumn()
  user: Users;

  @Column()
  specialization: string;

  @Column({ nullable: true })
  qualifications: string;

  @Column({ nullable: true })
  experienceYears: number;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ type: 'text', nullable: true })
  bio: string;
}
