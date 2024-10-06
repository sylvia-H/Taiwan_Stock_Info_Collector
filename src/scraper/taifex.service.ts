import * as csvtojson from 'csvtojson'
import * as iconv from 'iconv-lite'
import * as numeral from 'numeral'
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { DateTime } from 'luxon'

@Injectable()
export class TaifexService {
  private readonly taifexURL: string

  constructor(private httpService: HttpService) {
    this.taifexURL = 'https://www.taifex.com.tw/cht'
  }

  // 取得三大法人臺股期貨未平倉淨口數
  async getThreeMajorOpenPositionTXF(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const queryDate = DateTime.fromISO(date).toFormat('yyyy/MM/dd')
    const form = new URLSearchParams({
      queryStartDate: queryDate,
      queryEndDate: queryDate,
      commodityId: 'TXF'
    })
    const url = `${this.taifexURL}/3/futContractsDateDown`

    const response = await firstValueFrom(
      this.httpService.post(url, form, { responseType: 'arraybuffer' })
    )
    const json = await csvtojson({ noheader: true, output: 'csv' }).fromString(
      iconv.decode(response.data, 'big5')
    )
    const [fields, dealers, sitc, fini] = json
    if (fields[0] !== '日期') return null

    return {
      date,
      finiTxfNetOi: numeral(fini[13]).value(),
      sitcTxfNetOi: numeral(sitc[13]).value(),
      dealersTxfNetOi: numeral(dealers[13]).value()
    }
  }

  // 取得三大法人臺指選擇權未平倉
  async getThreeMajorOpenPositionTXO(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const queryDate = DateTime.fromISO(date).toFormat('yyyy/MM/dd')
    const form = new URLSearchParams({
      queryStartDate: queryDate,
      queryEndDate: queryDate,
      commodityId: 'TXO'
    })
    const url = `${this.taifexURL}/3/callsAndPutsDateDown`

    const response = await firstValueFrom(
      this.httpService.post(url, form, { responseType: 'arraybuffer' })
    )
    const json = await csvtojson({ noheader: true, output: 'csv' }).fromString(
      iconv.decode(response.data, 'big5')
    )
    const [
      fields,
      dealersCalls,
      sitcCalls,
      finiCalls,
      dealersPuts,
      sitcPuts,
      finiPuts
    ] = json
    if (fields[0] !== '日期') return null

    return {
      date,
      finiTxoCallsNetOi: numeral(finiCalls[14]).value(),
      finiTxoCallsNetOiValue: numeral(finiCalls[15]).value(),
      sitcTxoCallsNetOi: numeral(sitcCalls[14]).value(),
      sitcTxoCallsNetOiValue: numeral(sitcCalls[15]).value(),
      dealersTxoCallsNetOi: numeral(dealersCalls[14]).value(),
      dealersTxoCallsNetOiValue: numeral(dealersCalls[15]).value(),
      finiTxoPutsNetOi: numeral(finiPuts[14]).value(),
      finiTxoPutsNetOiValue: numeral(finiPuts[15]).value(),
      sitcTxoPutsNetOi: numeral(sitcPuts[14]).value(),
      sitcTxoPutsNetOiValue: numeral(sitcPuts[15]).value(),
      dealersTxoPutsNetOi: numeral(dealersPuts[14]).value(),
      dealersTxoPutsNetOiValue: numeral(dealersPuts[15]).value()
    }
  }
}
