import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post } from '../../common/entities/post.entity';
import { Platform } from '../../common/entities/platform.entity';
import { Influencer } from '../../common/entities/influencer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Platform, Influencer]),
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
