import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { AccessReviewStatus } from '@porichoy/shared-types';
import { Application } from './application.entity';
import { Identity } from './identity.entity';

@Entity('access_reviews')
export class AccessReview {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'application_uuid', nullable: true })
  applicationUuid!: string | null;

  @ManyToOne(() => Application, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'application_uuid' })
  application!: Application | null;

  @Column({ name: 'reviewer_uuid' })
  reviewerUuid!: string;

  @ManyToOne(() => Identity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewer_uuid' })
  reviewer!: Identity;

  @Column({ type: 'enum', enum: AccessReviewStatus, default: AccessReviewStatus.Open })
  status!: AccessReviewStatus;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}
