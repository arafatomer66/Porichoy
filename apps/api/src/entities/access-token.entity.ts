import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { OAuthClient } from './oauth-client.entity';
import { Identity } from './identity.entity';

@Entity('access_tokens')
export class AccessToken {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ length: 100, unique: true })
  jti!: string;

  @Column({ name: 'client_uuid' })
  clientUuid!: string;

  @ManyToOne(() => OAuthClient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_uuid' })
  client!: OAuthClient;

  @Column({ name: 'identity_uuid' })
  identityUuid!: string;

  @ManyToOne(() => Identity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'identity_uuid' })
  identity!: Identity;

  @Column({ type: 'text' })
  scope!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ default: false })
  revoked!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
