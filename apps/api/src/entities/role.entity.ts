import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { RoleType } from '@porichoy/shared-types';
import { Application } from './application.entity';

@Entity('roles')
@Unique(['applicationUuid', 'name'])
export class Role {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'application_uuid', nullable: true })
  applicationUuid!: string | null;

  @ManyToOne(() => Application, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_uuid' })
  application!: Application | null;

  @Column({ length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'role_type', type: 'enum', enum: RoleType, default: RoleType.Business })
  roleType!: RoleType;

  @Column({ name: 'is_requestable', default: true })
  isRequestable!: boolean;

  @Column({ name: 'max_duration_days', nullable: true })
  maxDurationDays!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
