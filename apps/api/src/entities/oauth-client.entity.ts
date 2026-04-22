import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { ClientType } from '@porichoy/shared-types';
import { Application } from './application.entity';

@Entity('oauth_clients')
export class OAuthClient {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'client_id', length: 100, unique: true })
  clientId!: string;

  @Column({ name: 'client_secret_hash', type: 'text', nullable: true })
  clientSecretHash!: string | null;

  @Column({ name: 'client_name', length: 200 })
  clientName!: string;

  @Column({ name: 'client_type', type: 'enum', enum: ClientType })
  clientType!: ClientType;

  @Column({ name: 'redirect_uris', type: 'text', array: true, default: [] })
  redirectUris!: string[];

  @Column({ name: 'allowed_scopes', type: 'text', array: true, default: [] })
  allowedScopes!: string[];

  @Column({ name: 'grant_types', type: 'text', array: true, default: [] })
  grantTypes!: string[];

  @Column({ name: 'token_endpoint_auth_method', length: 50, default: 'none' })
  tokenEndpointAuthMethod!: string;

  @Column({ name: 'application_uuid', nullable: true })
  applicationUuid!: string | null;

  @ManyToOne(() => Application, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'application_uuid' })
  application!: Application | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
