import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Identity } from './identity.entity';
import { OAuthClient } from './oauth-client.entity';

@Entity('consents')
export class Consent {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'identity_uuid' })
  identityUuid!: string;

  @ManyToOne(() => Identity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'identity_uuid' })
  identity!: Identity;

  @Column({ name: 'client_uuid' })
  clientUuid!: string;

  @ManyToOne(() => OAuthClient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_uuid' })
  client!: OAuthClient;

  @Column({ name: 'scopes_granted', type: 'text', array: true, default: [] })
  scopesGranted!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}
