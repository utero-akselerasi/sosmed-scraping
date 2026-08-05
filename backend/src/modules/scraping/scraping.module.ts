import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScrapingJob } from "../../common/entities/scraping-job.entity";
import { ScrapingController } from "./scraping.controller";
import { ScrapingService } from "./scraping.service";

@Module({
  imports: [TypeOrmModule.forFeature([ScrapingJob])],
  controllers: [ScrapingController],
  providers: [ScrapingService],
  exports: [ScrapingService],
})
export class ScrapingModule {}
