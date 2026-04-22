import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { SodEnforcement } from '@porichoy/shared-types';
import { Role } from './role.entity';

@Entity('sod_policies')
export class SodPolicy {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'conflicting_role_a' })
  conflictingRoleA!: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conflicting_role_a' })
  roleA!: Role;

  @Column({ name: 'conflicting_role_b' })
  conflictingRoleB!: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conflicting_role_b' })
  roleB!: Role;

  @Column({ type: 'enum', enum: SodEnforcement, default: SodEnforcement.Prevent })
  enforcement!: SodEnforcement;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
