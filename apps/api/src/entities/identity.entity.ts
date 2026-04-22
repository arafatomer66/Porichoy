import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { IdentityStatus, IdentityType } from '@porichoy/shared-types';
import { Credential } from './credential.entity';
import { Session } from './session.entity';

@Entity('identities')
export class Identity {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'display_name', length: 200 })
  displayName!: string;

  @Column({ nullable: true, unique: true, length: 200 })
  email!: string | null;

  @Column({ nullable: true, unique: true, length: 20 })
  phone!: string | null;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified!: boolean;

  @Column({ name: 'email_verified', default: false })
  emailVerified!: boolean;

  @Column({ type: 'enum', enum: IdentityStatus, default: IdentityStatus.Pending })
  status!: IdentityStatus;

  @Column({ name: 'identity_type', type: 'enum', enum: IdentityType, default: IdentityType.Person })
  identityType!: IdentityType;

  @Column({ name: 'is_admin', default: false })
  isAdmin!: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Credential, (c) => c.identity)
  credentials!: Credential[];

  @OneToMany(() => Session, (s) => s.identity)
  sessions!: Session[];
}
