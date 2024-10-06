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
  private async getThreeMajorOpenPositionTXF(options?: { date: string }) {
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
  private async getThreeMajorOpenPositionTXO(options?: { date: string }) {
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

  // 取得小臺指所有契約未沖銷量
  private async getMarketOiMXF(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const queryDate = DateTime.fromISO(date).toFormat('yyyy/MM/dd')
    const form = new URLSearchParams({
      down_type: '1',
      queryStartDate: queryDate,
      queryEndDate: queryDate,
      commodity_id: 'MTX'
    })
    const url = 'https://www.taifex.com.tw/cht/3/futDataDown'

    const response = await firstValueFrom(
      this.httpService.post(url, form, { responseType: 'arraybuffer' })
    )
    const json = await csvtojson({ noheader: true, output: 'csv' }).fromString(
      iconv.decode(response.data, 'big5')
    )
    const [fields, ...rows] = json
    if (fields[0] !== '交易日期') return null

    const mxfMarketOi = rows
      .filter((row) => row[17] === '一般' && !row[18])
      .reduce((oi, row) => oi + numeral(row[11]).value(), 0)

    return { date, mxfMarketOi }
  }

  // 取得三大法人小臺指多空未平倉
  private async getThreeMajorOpenPositionMXF(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const queryDate = DateTime.fromISO(date).toFormat('yyyy/MM/dd')
    const form = new URLSearchParams({
      queryStartDate: queryDate,
      queryEndDate: queryDate,
      commodityId: 'MXF'
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

    const dealersLongOi = numeral(dealers[9]).value()
    const dealersShortOi = numeral(dealers[11]).value()
    const sitcLongOi = numeral(sitc[9]).value()
    const sitcShortOi = numeral(sitc[11]).value()
    const finiLongOi = numeral(fini[9]).value()
    const finiShortOi = numeral(fini[11]).value()
    const MXFLongOi = dealersLongOi + sitcLongOi + finiLongOi
    const MXFShortOi = dealersShortOi + sitcShortOi + finiShortOi

    return { date, MXFLongOi, MXFShortOi }
  }

  // 取得小臺指散戶多空比
  async getRetailPositionMXF(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const [marketOiMXF, threeMajorOpenPositionMXF] = await Promise.all([
      this.getMarketOiMXF(options),
      this.getThreeMajorOpenPositionMXF(options)
    ])
    if (!marketOiMXF || !threeMajorOpenPositionMXF) return null

    const { mxfMarketOi } = marketOiMXF
    const { MXFLongOi, MXFShortOi } = threeMajorOpenPositionMXF
    const retailMxfLongOi = mxfMarketOi - MXFLongOi
    const retailMxfShortOi = mxfMarketOi - MXFShortOi
    const retailMxfNetOi = retailMxfLongOi - retailMxfShortOi
    const retailMxfLongShortRatio =
      Math.round((retailMxfNetOi / mxfMarketOi) * 10000) / 10000

    return {
      date,
      retailMxfLongOi, // 散戶小台多單
      retailMxfShortOi, // 散戶小台空單
      retailMxfNetOi, // 散戶小台淨部位
      retailMxfLongShortRatio // 散戶小台多空比
    }
  }
}
