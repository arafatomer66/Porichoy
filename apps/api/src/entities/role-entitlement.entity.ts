import {
  Entity, ManyToOne, JoinColumn, PrimaryColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { Entitlement } from './entitlement.entity';

@Entity('role_entitlements')
export class RoleEntitlement {
  @PrimaryColumn({ name: 'role_uuid' })
  roleUuid!: string;

  @PrimaryColumn({ name: 'entitlement_uuid' })
  entitlementUuid!: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_uuid' })
  role!: Role;

  @ManyToOne(() => Entitlement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entitlement_uuid' })
  entitlement!: Entitlement;
}
