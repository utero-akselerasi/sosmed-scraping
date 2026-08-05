import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import appConfig from "./config/app.config";
import typeormConfig from "./config/typeorm.config";
import { AuthModule } from "./modules/auth/auth.module";
import { PostsModule } from "./modules/posts/posts.module";
import { PlatformsModule } from "./modules/platforms/platforms.module";
import { InfluencersModule } from "./modules/influencers/influencers.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { KeywordsModule } from "./modules/keywords/keywords.module";
import { ScrapingModule } from "./modules/scraping/scraping.module";
import { UsersModule } from "./modules/users/users.module";
import {
  User,
  Platform,
  Influencer,
  Post,
  Comment,
  Keyword,
  Hashtag,
  ScrapingJob,
} from "./common/entities";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, typeormConfig],
      envFilePath: [".env.local", ".env", "../.env"],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("database.host"),
        port: configService.get("database.port"),
        username: configService.get("database.username"),
        password: configService.get("database.password"),
        database: configService.get("database.database"),
        entities: [
          User,
          Platform,
          Influencer,
          Post,
          Comment,
          Keyword,
          Hashtag,
          ScrapingJob,
        ],
        synchronize: false,
        logging: configService.get("database.logging"),
        ssl: configService.get("database.ssl"),
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get("rateLimit.ttl"),
            limit: configService.get("rateLimit.max"),
          },
        ],
      }),
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Feature Modules
    AuthModule,
    PostsModule,
    PlatformsModule,
    InfluencersModule,
    AnalyticsModule,
    KeywordsModule,
    UsersModule,
    ScrapingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
