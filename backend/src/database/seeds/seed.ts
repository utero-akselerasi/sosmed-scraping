import { DataSource } from "typeorm";
import { config as dotenvConfig } from "dotenv";
import * as bcrypt from "bcrypt";
import { User, UserRole } from "../../common/entities/user.entity";
import { Platform, PlatformType } from "../../common/entities/platform.entity";
import { Influencer } from "../../common/entities/influencer.entity";
import {
  Post,
  PostType,
  SentimentType,
} from "../../common/entities/post.entity";
import { Keyword } from "../../common/entities/keyword.entity";
import { ScrapingJob } from "../../common/entities/scraping-job.entity";

dotenvConfig({ path: ".env" });

async function seed() {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5433,
    username: process.env.DB_USER || "mbois_user",
    password: process.env.DB_PASSWORD || "mbois_password_2026",
    database: process.env.DB_NAME || "festival_mbois",
    entities: [User, Platform, Influencer, Post, Keyword, ScrapingJob],
    synchronize: false,
    logging: false,
    ssl:
      process.env.DB_SSL === "true"
        ? ({ rejectUnauthorized: false } as any)
        : false,
  });

  try {
    await dataSource.initialize();
    console.log("Database connected successfully");

    const userRepo = dataSource.getRepository(User);
    const platformRepo = dataSource.getRepository(Platform);
    const influencerRepo = dataSource.getRepository(Influencer);
    const postRepo = dataSource.getRepository(Post);
    const keywordRepo = dataSource.getRepository(Keyword);

    // 1. Admin User
    const existingAdmin = await userRepo.findOne({
      where: { email: "admin@festivalmbois.com" },
    });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const adminUser = userRepo.create({
        email: "admin@festivalmbois.com",
        passwordHash: hashedPassword,
        fullName: "Administrator",
        role: UserRole.ADMIN,
        isActive: true,
      });
      await userRepo.save(adminUser);
      console.log("Admin user created: admin@festivalmbois.com");
    }

    // 2. Platforms
    const platformsData = [
      { name: "Instagram", type: PlatformType.INSTAGRAM, isActive: true },
      { name: "TikTok", type: PlatformType.TIKTOK, isActive: true },
      { name: "Facebook", type: PlatformType.FACEBOOK, isActive: true },
      { name: "Twitter/X", type: PlatformType.TWITTER, isActive: true },
      { name: "Threads", type: PlatformType.THREADS, isActive: true },
      { name: "Website", type: PlatformType.WEBSITE, isActive: true },
    ];

    const platformsMap: Record<string, Platform> = {};

    for (const pf of platformsData) {
      let platform = await platformRepo.findOne({ where: { name: pf.name } });
      if (!platform) {
        platform = platformRepo.create(pf);
        await platformRepo.save(platform);
        console.log(`Platform created: ${pf.name}`);
      }
      platformsMap[pf.name] = platform;
    }

    // 3. Keywords (lowercase to match canonical schema.sql seed)
    const defaultKeywords = [
      { keyword: "festival mbois", isActive: true },
      { keyword: "mbois", isActive: true },
      { keyword: "mbois 2026", isActive: true },
    ];

    for (const kw of defaultKeywords) {
      const existing = await keywordRepo.findOne({
        where: { keyword: kw.keyword },
      });
      if (!existing) {
        const keyword = keywordRepo.create(kw);
        await keywordRepo.save(keyword);
        console.log(`Keyword created: ${kw.keyword}`);
      }
    }

    // 4. Sample Influencers for Instagram and TikTok
    const igPlatform = platformsMap["Instagram"];
    const ttPlatform = platformsMap["TikTok"];

    const influencersData = [
      {
        platformId: igPlatform.id,
        platformUserId: "ig_001",
        username: "festivalmbois_official",
        fullName: "Festival Mbois 2026",
        profilePictureUrl:
          "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=150",
        bio: "Official Instagram of Festival Mbois Malang 2026 🎉 #FestivalMbois",
        followersCount: 45200,
        followingCount: 120,
        postsCount: 184,
        engagementRate: 8.45,
        isVerified: true,
      },
      {
        platformId: igPlatform.id,
        platformUserId: "ig_002",
        username: "infomalangraya",
        fullName: "Info Malang Raya",
        profilePictureUrl:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        bio: "Portal Berita & Seputar Events di Malang Raya.",
        followersCount: 128000,
        followingCount: 450,
        postsCount: 1420,
        engagementRate: 5.12,
        isVerified: true,
      },
      {
        platformId: ttPlatform.id,
        platformUserId: "tt_001",
        username: "mbois_creative",
        fullName: "Mbois Creative Hub",
        profilePictureUrl:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        bio: "Komunitas Industri Kreatif Malang 🚀",
        followersCount: 67300,
        followingCount: 85,
        postsCount: 96,
        engagementRate: 11.2,
        isVerified: false,
      },
      {
        platformId: ttPlatform.id,
        platformUserId: "tt_002",
        username: "kulinermalangmbois",
        fullName: "Kuliner Malang Mbois",
        profilePictureUrl:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        bio: "Review jajanan & event seru Malang!",
        followersCount: 94100,
        followingCount: 210,
        postsCount: 310,
        engagementRate: 9.8,
        isVerified: false,
      },
    ];

    const influencersMap: Record<string, Influencer> = {};

    for (const infData of influencersData) {
      let influencer = await influencerRepo.findOne({
        where: { platformId: infData.platformId, username: infData.username },
      });
      if (!influencer) {
        influencer = influencerRepo.create(infData);
        await influencerRepo.save(influencer);
        console.log(`Influencer created: @${infData.username}`);
      }
      influencersMap[infData.username] = influencer;
    }

    // 5. Sample Posts
    const samplePosts = [
      {
        platformId: igPlatform.id,
        influencerId: influencersMap["festivalmbois_official"].id,
        platformPostId: "ig_post_101",
        postType: PostType.POST,
        content:
          "Siap-siap rek! Festival Mbois 2026 bakal hadir lebih meriah dengan puluhan UMKM dan pertunjukan seni! 🔥 #FestivalMbois #MalangKreatif",
        postUrl: "https://instagram.com/p/C1234567890",
        likesCount: 3420,
        commentsCount: 284,
        sharesCount: 512,
        viewsCount: 18500,
        sentiment: SentimentType.POSITIVE,
        sentimentScore: 0.92,
        hashtags: ["FestivalMbois", "MalangKreatif", "MalangEvent"],
        postedAt: new Date("2026-07-28T10:00:00Z"),
      },
      {
        platformId: igPlatform.id,
        influencerId: influencersMap["infomalangraya"].id,
        platformPostId: "ig_post_102",
        postType: PostType.REEL,
        content:
          "Highlight keseruan opening ceremony Festival Mbois tahun ini! Ramai banget lur! 🎉 #infomalang #FestivalMbois",
        postUrl: "https://instagram.com/reel/C0987654321",
        likesCount: 8900,
        commentsCount: 610,
        sharesCount: 1420,
        viewsCount: 64000,
        sentiment: SentimentType.POSITIVE,
        sentimentScore: 0.88,
        hashtags: ["infomalang", "FestivalMbois"],
        postedAt: new Date("2026-07-27T14:30:00Z"),
      },
      {
        platformId: ttPlatform.id,
        influencerId: influencersMap["mbois_creative"].id,
        platformPostId: "tt_post_201",
        postType: PostType.VIDEO,
        content:
          "Spot foto paling aesthetic di Festival Mbois Malang! Wajib datang bareng temen-temen kalian 📸✨",
        postUrl: "https://tiktok.com/@mbois_creative/video/7123456789",
        likesCount: 15400,
        commentsCount: 890,
        sharesCount: 2300,
        viewsCount: 112000,
        sentiment: SentimentType.POSITIVE,
        sentimentScore: 0.95,
        hashtags: ["FestivalMbois", "MalangKuliner", "FYP"],
        postedAt: new Date("2026-07-29T08:15:00Z"),
      },
      {
        platformId: ttPlatform.id,
        influencerId: influencersMap["kulinermalangmbois"].id,
        platformPostId: "tt_post_202",
        postType: PostType.VIDEO,
        content:
          "Antrean tenant kuliner di Festival Mbois agak panjang ya, tapi terbayar sama rasanya! 👍",
        postUrl: "https://tiktok.com/@kulinermalangmbois/video/7987654321",
        likesCount: 4200,
        commentsCount: 310,
        sharesCount: 450,
        viewsCount: 38000,
        sentiment: SentimentType.NEUTRAL,
        sentimentScore: 0.5,
        hashtags: ["FestivalMbois", "KulinerMalang"],
        postedAt: new Date("2026-07-29T12:00:00Z"),
      },
    ];

    for (const pData of samplePosts) {
      const existing = await postRepo.findOne({
        where: {
          platformId: pData.platformId,
          platformPostId: pData.platformPostId,
        },
      });
      if (!existing) {
        const post = postRepo.create(pData);
        await postRepo.save(post);
        console.log(`Post created: ${pData.platformPostId}`);
      }
    }

    console.log(
      "Seed with rich Instagram & TikTok stats completed successfully!",
    );
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seed();
