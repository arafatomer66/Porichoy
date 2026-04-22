import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { PolicyType, PolicyEffect } from '@porichoy/shared-types';

@Entity('auth_policies')
export class AuthPolicy {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'policy_type', type: 'enum', enum: PolicyType })
  policyType!: PolicyType;

  @Column({ length: 200 })
  resource!: string;

  @Column({ length: 100 })
  action!: string;

  @Column({ type: 'jsonb', default: {} })
  conditions!: Record<string, unknown>;

  @Column({ type: 'enum', enum: PolicyEffect, default: PolicyEffect.Allow })
  effect!: PolicyEffect;

  @Column({ default: 0 })
  priority!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
