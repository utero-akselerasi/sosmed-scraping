import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum UserRole {
  ADMIN = "admin",
  ANALYST = "analyst",
  VIEWER = "viewer",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Column({ name: "password_hash", length: 255 })
  passwordHash: string;

  @Column({ name: "full_name", length: 255 })
  fullName: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  @Index()
  role: UserRole;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "last_login", type: "timestamp", nullable: true })
  lastLogin: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
