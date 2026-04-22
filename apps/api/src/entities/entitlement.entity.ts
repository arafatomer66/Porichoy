import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { Application } from './application.entity';

@Entity('entitlements')
@Unique(['applicationUuid', 'entitlementKey'])
export class Entitlement {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'application_uuid' })
  applicationUuid!: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_uuid' })
  application!: Application;

  @Column({ name: 'entitlement_key', length: 200 })
  entitlementKey!: string;

  @Column({ name: 'display_name', length: 200 })
  displayName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
