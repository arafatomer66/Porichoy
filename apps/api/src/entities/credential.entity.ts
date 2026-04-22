import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { CredentialType } from '@porichoy/shared-types';
import { Identity } from './identity.entity';

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'identity_uuid' })
  identityUuid!: string;

  @ManyToOne(() => Identity, (i) => i.credentials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'identity_uuid' })
  identity!: Identity;

  @Column({ name: 'credential_type', type: 'enum', enum: CredentialType })
  credentialType!: CredentialType;

  @Column({ name: 'credential_hash', type: 'text', nullable: true })
  credentialHash!: string | null;

  @Column({ name: 'otp_value', length: 6, nullable: true })
  otpValue!: string | null;

  @Column({ name: 'otp_expires_at', type: 'bigint', nullable: true })
  otpExpiresAt!: number | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
