import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { ReviewDecision } from '@porichoy/shared-types';
import { AccessReview } from './access-review.entity';
import { Identity } from './identity.entity';
import { Role } from './role.entity';

@Entity('access_review_items')
export class AccessReviewItem {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'review_uuid' })
  reviewUuid!: string;

  @ManyToOne(() => AccessReview, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_uuid' })
  review!: AccessReview;

  @Column({ name: 'identity_uuid' })
  identityUuid!: string;

  @ManyToOne(() => Identity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'identity_uuid' })
  identity!: Identity;

  @Column({ name: 'role_uuid' })
  roleUuid!: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_uuid' })
  role!: Role;

  @Column({ type: 'enum', enum: ReviewDecision, default: ReviewDecision.Pending })
  decision!: ReviewDecision;

  @Column({ name: 'decided_by', nullable: true })
  decidedBy!: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  comments!: string;
}
