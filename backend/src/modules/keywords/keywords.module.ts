import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeywordsController } from './keywords.controller';
import { KeywordsService } from './keywords.service';
import { Keyword } from '../../common/entities/keyword.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Keyword]),
  ],
  controllers: [KeywordsController],
  providers: [KeywordsService],
  exports: [KeywordsService],
})
export class KeywordsModule {}
