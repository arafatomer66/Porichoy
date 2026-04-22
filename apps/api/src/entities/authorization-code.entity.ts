import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { OAuthClient } from './oauth-client.entity';
import { Identity } from './identity.entity';

@Entity('authorization_codes')
export class AuthorizationCode {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ length: 256, unique: true })
  code!: string;

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

  @Column({ name: 'redirect_uri', type: 'text' })
  redirectUri!: string;

  @Column({ type: 'text' })
  scope!: string;

  @Column({ name: 'code_challenge', type: 'text', nullable: true })
  codeChallenge!: string | null;

  @Column({ name: 'code_challenge_method', length: 10, default: 'S256' })
  codeChallengeMethod!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ default: false })
  used!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
