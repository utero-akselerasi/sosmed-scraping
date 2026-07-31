import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { Post } from "../../common/entities/post.entity";
import { Influencer } from "../../common/entities/influencer.entity";
import { Platform } from "../../common/entities/platform.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Post, Influencer, Platform])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
