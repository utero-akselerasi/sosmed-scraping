import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScrapingJob } from "../../common/entities/scraping-job.entity";
import { Post } from "../../common/entities/post.entity";
import { ScrapingController } from "./scraping.controller";
import { ScrapingService } from "./scraping.service";
import { ScrapingGateway } from "./scraping.gateway";

@Module({
  imports: [TypeOrmModule.forFeature([ScrapingJob, Post])],
  controllers: [ScrapingController],
  providers: [ScrapingService, ScrapingGateway],
  exports: [ScrapingService, ScrapingGateway],
})
export class ScrapingModule {}
