import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from '../users/users.entity';

/** One-off blocks that override the weekly pattern (leave, conference, etc.). */
@Entity()
export class TimeOff {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  doctor: Users;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  reason: string;
}
