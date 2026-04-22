import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { LifecycleEventType, LifecycleEventStatus } from '@porichoy/shared-types';
import { Identity } from './identity.entity';

@Entity('lifecycle_events')
export class LifecycleEvent {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'identity_uuid' })
  identityUuid!: string;

  @ManyToOne(() => Identity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'identity_uuid' })
  identity!: Identity;

  @Column({ name: 'event_type', type: 'enum', enum: LifecycleEventType })
  eventType!: LifecycleEventType;

  @Column({ length: 100, default: 'manual' })
  source!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @Column({ type: 'enum', enum: LifecycleEventStatus, default: LifecycleEventStatus.Pending })
  status!: LifecycleEventStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;
}
