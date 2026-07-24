import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import appConfig from './config/app.config';
import typeormConfig from './config/typeorm.config';
import { AuthModule } from './modules/auth/auth.module';
import {
  User,
  Platform,
  Influencer,
  Post,
  Comment,
  Keyword,
  Hashtag,
  ScrapingJob,
} from './common/entities';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, typeormConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
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
        logging: configService.get('database.logging'),
        ssl: configService.get('database.ssl'),
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get('rateLimit.ttl'),
        limit: configService.get('rateLimit.max'),
      }),
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Feature Modules
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
