import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InfluencersController } from "./influencers.controller";
import { InfluencersService } from "./influencers.service";
import { Influencer } from "../../common/entities/influencer.entity";
import { Platform } from "../../common/entities/platform.entity";
import { Post } from "../../common/entities/post.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Influencer, Platform, Post])],
  controllers: [InfluencersController],
  providers: [InfluencersService],
  exports: [InfluencersService],
})
export class InfluencersModule {}
