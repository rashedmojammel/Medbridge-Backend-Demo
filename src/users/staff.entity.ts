import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from './users.entity';

@Entity()
export class Staff {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Users, { eager: true })
  @JoinColumn()
  user: Users;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  designation: string;
}
