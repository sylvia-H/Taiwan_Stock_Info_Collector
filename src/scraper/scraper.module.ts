import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common/decorators'
import { TwseService } from './twse.service'
import { TpexService } from './tpex.service'
import { TaifexService } from './taifex.service';

@Module({
  imports: [HttpModule],
  providers: [TwseService, TpexService, TaifexService]
})
export class ScraperModule {}
