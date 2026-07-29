import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Platform } from './platform.entity';

export enum CollectionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('scraping_jobs')
export class ScrapingJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'platform_id', type: 'uuid' })
  @Index()
  platformId: string;

  @ManyToOne(() => Platform)
  @JoinColumn({ name: 'platform_id' })
  platform: Platform;

  @Column({
    type: 'enum',
    enum: CollectionStatus,
    default: CollectionStatus.PENDING,
  })
  @Index()
  status: CollectionStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'posts_collected', default: 0 })
  postsCollected: number;

  @Column({ name: 'errors_count', default: 0 })
  errorsCount: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
