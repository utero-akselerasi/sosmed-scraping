import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Platform } from "./platform.entity";

@Entity("influencers")
export class Influencer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "platform_id", type: "uuid" })
  @Index()
  platformId: string;

  @ManyToOne(() => Platform)
  @JoinColumn({ name: "platform_id" })
  platform: Platform;

  @Column({ name: "platform_user_id", length: 255 })
  platformUserId: string;

  @Column({ length: 255 })
  @Index()
  username: string;

  @Column({ name: "full_name", length: 255, nullable: true })
  fullName: string;

  @Column({ name: "profile_picture_url", type: "text", nullable: true })
  profilePictureUrl: string;

  @Column({ type: "text", nullable: true })
  bio: string;

  @Column({ name: "followers_count", default: 0 })
  @Index()
  followersCount: number;

  @Column({ name: "following_count", default: 0 })
  followingCount: number;

  @Column({ name: "posts_count", default: 0 })
  postsCount: number;

  @Column({
    name: "engagement_rate",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0,
  })
  @Index()
  engagementRate: number;

  @Column({ name: "is_verified", default: false })
  isVerified: boolean;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @Column({ name: "last_scraped_at", type: "timestamp", nullable: true })
  lastScrapedAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
