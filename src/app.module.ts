import { Module } from '@nestjs/common/decorators'
import { ScraperModule } from './scraper/scraper.module'

@Module({
  imports: [ScraperModule]
})
export class AppModule {}
