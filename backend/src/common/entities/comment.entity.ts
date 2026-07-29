import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SentimentType } from './post.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'post_id', type: 'uuid' })
  @Index()
  postId: string;

  @Column({ name: 'platform_comment_id', length: 255 })
  platformCommentId: string;

  @Column({ name: 'author_username', length: 255, nullable: true })
  authorUsername: string;

  @Column({ name: 'author_name', length: 255, nullable: true })
  authorName: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'likes_count', default: 0 })
  likesCount: number;

  @Column({
    type: 'enum',
    enum: SentimentType,
    nullable: true,
  })
  @Index()
  sentiment: SentimentType;

  @Column({ name: 'sentiment_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  sentimentScore: number;

  @Column({ name: 'commented_at', type: 'timestamp' })
  @Index()
  commentedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
