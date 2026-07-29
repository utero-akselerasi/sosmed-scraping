import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../../common/entities/user.entity';
import { Platform, PlatformType } from '../../common/entities/platform.entity';
import { Keyword } from '../../common/entities/keyword.entity';

dotenvConfig({ path: '.env' });

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5433,
    username: process.env.DB_USER || 'mbois_user',
    password: process.env.DB_PASSWORD || 'mbois_password_2026',
    database: process.env.DB_NAME || 'festival_mbois',
    entities: [User, Platform, Keyword],
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } as any : false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected successfully');

    const userRepo = dataSource.getRepository(User);
    const platformRepo = dataSource.getRepository(Platform);
    const keywordRepo = dataSource.getRepository(Keyword);

    const existingAdmin = await userRepo.findOne({ where: { email: 'admin@festivalmbois.com' } });
    if (existingAdmin) {
      console.log('Admin user already exists, skipping...');
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminUser = userRepo.create({
        email: 'admin@festivalmbois.com',
        passwordHash: hashedPassword,
        fullName: 'Admin Mbois',
        role: UserRole.ADMIN,
        isActive: true,
      });
      await userRepo.save(adminUser);
      console.log('Admin user created: admin@festivalmbois.com / admin123');
    }

    const defaultPlatforms = [
      { name: 'Instagram', type: PlatformType.INSTAGRAM, isActive: true },
      { name: 'TikTok', type: PlatformType.TIKTOK, isActive: true },
      { name: 'Website', type: PlatformType.WEBSITE, isActive: true },
    ];

    for (const pf of defaultPlatforms) {
      const existing = await platformRepo.findOne({ where: { name: pf.name } });
      if (existing) {
        console.log(`Platform "${pf.name}" already exists, skipping...`);
      } else {
        const platform = platformRepo.create(pf);
        await platformRepo.save(platform);
        console.log(`Platform created: ${pf.name}`);
      }
    }

    const defaultKeywords = [
      { keyword: 'Festival Mbois', category: 'event', isActive: true },
      { keyword: 'Mbois', category: 'brand', isActive: true },
      { keyword: 'Mbois 2026', category: 'event', isActive: true },
    ];

    for (const kw of defaultKeywords) {
      const existing = await keywordRepo.findOne({ where: { keyword: kw.keyword } });
      if (existing) {
        console.log(`Keyword "${kw.keyword}" already exists, skipping...`);
      } else {
        const keyword = keywordRepo.create(kw);
        await keywordRepo.save(keyword);
        console.log(`Keyword created: ${kw.keyword}`);
      }
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seed();
