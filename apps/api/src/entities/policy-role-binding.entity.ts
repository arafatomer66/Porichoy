import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { AuthPolicy } from './auth-policy.entity';
import { Role } from './role.entity';

@Entity('policy_role_bindings')
export class PolicyRoleBinding {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'policy_uuid' })
  policyUuid!: string;

  @ManyToOne(() => AuthPolicy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policy_uuid' })
  policy!: AuthPolicy;

  @Column({ name: 'role_uuid' })
  roleUuid!: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_uuid' })
  role!: Role;
}
