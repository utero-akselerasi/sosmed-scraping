import { DataSource } from "typeorm";
import { config as dotenvConfig } from "dotenv";
import * as bcrypt from "bcrypt";
import { User, UserRole } from "../../common/entities/user.entity";
import { Platform, PlatformType } from "../../common/entities/platform.entity";
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
    entities: [User, Platform, Keyword, ScrapingJob],
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

    for (const pf of platformsData) {
      let platform = await platformRepo.findOne({ where: { name: pf.name } });
      if (!platform) {
        platform = platformRepo.create(pf);
        await platformRepo.save(platform);
        console.log(`Platform created: ${pf.name}`);
      }
    }

    // 3. Keywords (canonical set matching schema.sql seed)
    const defaultKeywords = [
      { keyword: "festival mbois", isActive: true, priority: 1 },
      { keyword: "mbois", isActive: true, priority: 1 },
      { keyword: "#festivalmbois", isActive: true, priority: 2 },
      { keyword: "#mbois", isActive: true, priority: 2 },
      { keyword: "mbois festival", isActive: true, priority: 1 },
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

    console.log(
      "Seed completed successfully: admin user, platforms, and canonical keywords",
    );
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seed();
