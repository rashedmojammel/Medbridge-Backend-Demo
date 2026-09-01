import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from './users.entity';

@Entity()
export class HealthWorkers {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Users, { eager: true })
  @JoinColumn()
  user: Users;

  @Column({ nullable: true })
  assignedArea: string;

  @Column({ type: 'date', nullable: true })
  activeSince: string;
}
