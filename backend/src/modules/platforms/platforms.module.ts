import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformsController } from './platforms.controller';
import { PlatformsService } from './platforms.service';
import { Platform } from '../../common/entities/platform.entity';
import { Post } from '../../common/entities/post.entity';
import { Influencer } from '../../common/entities/influencer.entity';
import { ScrapingJob } from '../../common/entities/scraping-job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Platform, Post, Influencer, ScrapingJob]),
  ],
  controllers: [PlatformsController],
  providers: [PlatformsService],
  exports: [PlatformsService],
})
export class PlatformsModule {}
