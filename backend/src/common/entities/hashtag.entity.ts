import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('hashtags')
export class Hashtag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  hashtag: string;

  @Column({ name: 'usage_count', default: 0 })
  @Index()
  usageCount: number;

  @Column({ name: 'first_seen_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  firstSeenAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  lastSeenAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
