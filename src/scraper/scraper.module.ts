import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common/decorators'
import { TwseService } from './twse.service'
import { TpexService } from './tpex.service';

@Module({
  imports: [HttpModule],
  providers: [TwseService, TpexService]
})
export class ScraperModule {}
