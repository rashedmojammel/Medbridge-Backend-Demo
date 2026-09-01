import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Key-value store for values that should not require a redeploy to change.
 * Most importantly the triage thresholds - those are clinical parameters and
 * hardcoding them means a clinician cannot adjust them without a developer.
 */
@Entity()
export class SystemSettings {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'general' })
  category: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
