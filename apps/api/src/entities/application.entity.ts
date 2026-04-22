import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { AppType, ConnectorType, ApplicationStatus } from '@porichoy/shared-types';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'app_type', type: 'enum', enum: AppType })
  appType!: AppType;

  @Column({ name: 'base_url', type: 'text', nullable: true })
  baseUrl!: string;

  @Column({ name: 'connector_type', type: 'enum', enum: ConnectorType, default: ConnectorType.Manual })
  connectorType!: ConnectorType;

  @Column({ name: 'connector_config', type: 'jsonb', default: {} })
  connectorConfig!: Record<string, unknown>;

  @Column({ name: 'provisioning_enabled', default: false })
  provisioningEnabled!: boolean;

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.Pending })
  status!: ApplicationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
