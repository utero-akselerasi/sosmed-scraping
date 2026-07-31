import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { Platform } from "./platform.entity";
import { Influencer } from "./influencer.entity";

export enum PostType {
  POST = "post",
  REEL = "reel",
  STORY = "story",
  VIDEO = "video",
  ARTICLE = "article",
}

export enum SentimentType {
  POSITIVE = "positive",
  NEUTRAL = "neutral",
  NEGATIVE = "negative",
}

@Entity("posts")
export class Post {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "platform_id", type: "uuid" })
  @Index()
  platformId: string;

  @ManyToOne(() => Platform)
  @JoinColumn({ name: "platform_id" })
  platform: Platform;

  @Column({ name: "influencer_id", type: "uuid" })
  @Index()
  influencerId: string;

  @ManyToOne(() => Influencer)
  @JoinColumn({ name: "influencer_id" })
  influencer: Influencer;

  @Column({ name: "platform_post_id", length: 255 })
  platformPostId: string;

  @Column({
    name: "post_type",
    type: "enum",
    enum: PostType,
  })
  postType: PostType;

  @Column({ type: "text", nullable: true })
  content: string;

  @Column({ name: "media_urls", type: "text", array: true, default: [] })
  mediaUrls: string[];

  @Column({ name: "post_url", type: "text", nullable: true })
  postUrl: string;

  @Column({ name: "likes_count", default: 0 })
  likesCount: number;

  @Column({ name: "comments_count", default: 0 })
  commentsCount: number;

  @Column({ name: "shares_count", default: 0 })
  sharesCount: number;

  @Column({ name: "views_count", default: 0 })
  viewsCount: number;

  @Column({
    name: "engagement_score",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  @Index()
  engagementScore: number;

  @Column({
    type: "enum",
    enum: SentimentType,
    nullable: true,
  })
  @Index()
  sentiment: SentimentType;

  @Column({
    name: "sentiment_score",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  sentimentScore: number;

  @Column({ type: "text", array: true, default: [] })
  hashtags: string[];

  @Column({ type: "text", array: true, default: [] })
  mentions: string[];

  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ name: "posted_at", type: "timestamp" })
  @Index()
  postedAt: Date;

  @Column({
    name: "scraped_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  scrapedAt: Date;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  calculateEngagementScore() {
    this.engagementScore =
      (this.likesCount || 0) * 1.0 +
      (this.commentsCount || 0) * 2.0 +
      (this.sharesCount || 0) * 3.0 +
      (this.viewsCount || 0) * 0.01;
  }
}
