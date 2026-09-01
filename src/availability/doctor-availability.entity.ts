import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Users } from '../users/users.entity';

/**
 * Weekly recurring consulting hours. The CHW scheduling screen currently
 * offers hardcoded time slots; this lets it offer only real ones.
 * dayOfWeek follows JS convention: 0 = Sunday.
 */
@Entity()
@Unique(['doctor', 'dayOfWeek', 'startTime'])
export class DoctorAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  doctor: Users;

  @Column({ type: 'int' })
  dayOfWeek: number;

  @Column({ type: 'time' })
  startTime: string; // '09:00'

  @Column({ type: 'time' })
  endTime: string; // '13:00'

  @Column({ type: 'int', default: 30 })
  slotMinutes: number;

  @Column({ default: true })
  isActive: boolean;
}
