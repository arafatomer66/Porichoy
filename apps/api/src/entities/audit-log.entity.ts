import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'actor_uuid', nullable: true })
  actorUuid!: string | null;

  @Column({ length: 100 })
  action!: string;

  @Column({ name: 'resource_type', length: 100 })
  resourceType!: string;

  @Column({ name: 'resource_uuid', nullable: true })
  resourceUuid!: string | null;

  @Column({ type: 'jsonb', default: {} })
  details!: Record<string, unknown>;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: 'timestamp', type: 'timestamptz' })
  timestamp!: Date;
}
