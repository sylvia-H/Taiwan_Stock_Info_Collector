import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common/decorators'
import { TwseService } from './twse.service'

@Module({
  imports: [HttpModule],
  providers: [TwseService]
})
export class ScraperModule {}
