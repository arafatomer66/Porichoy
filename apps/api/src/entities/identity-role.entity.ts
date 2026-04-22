import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { IdentityRoleStatus } from '@porichoy/shared-types';
import { Identity } from './identity.entity';
import { Role } from './role.entity';

@Entity('identity_roles')
export class IdentityRole {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

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

  @Column({ type: 'jsonb', default: {} })
  context!: Record<string, unknown>;

  @Column({ name: 'granted_by', nullable: true })
  grantedBy!: string | null;

  @Column({ name: 'granted_reason', type: 'text', nullable: true })
  grantedReason!: string;

  @Column({ name: 'starts_at', type: 'timestamptz', default: () => 'NOW()' })
  startsAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'enum', enum: IdentityRoleStatus, default: IdentityRoleStatus.Active })
  status!: IdentityRoleStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
