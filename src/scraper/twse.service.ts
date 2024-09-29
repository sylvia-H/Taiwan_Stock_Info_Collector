import * as cheerio from 'cheerio'
import * as iconv from 'iconv-lite'
import * as numeral from 'numeral'
import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { firstValueFrom } from 'rxjs'
import { DateTime } from 'luxon'

@Injectable()
export class TwseService {
  private readonly twseURL: string

  constructor(private httpService: HttpService) {
    this.twseURL = 'https://www.twse.com.tw/rwd/zh'
  }

  // 取得上市/櫃股票清單
  async getStockLists(options?: { market: 'TSE' | 'OTC' }) {
    const market = options.market ?? 'TSE'
    const url = {
      TSE: 'https://isin.twse.com.tw/isin/class_main.jsp?market=1&issuetype=1',
      OTC: 'https://isin.twse.com.tw/isin/class_main.jsp?market=2&issuetype=4'
    }
    const response = await firstValueFrom(
      this.httpService.get(url[market], { responseType: 'arraybuffer' })
    )
    const page = iconv.decode(response.data, 'big5')
    const $ = cheerio.load(page)

    return $('.h4 tr')
      .slice(1)
      .map((_, el) => {
        const td = $(el).find('td')
        return {
          symbol: td.eq(2).text().trim(),
          name: td.eq(3).text().trim(),
          market: td.eq(4).text().trim(),
          industry: td.eq(6).text().trim()
        }
      })
      .toArray()
  }

  // 取得指定日期的集中市場成交資訊
  async getTradesInfo(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const query = new URLSearchParams({
      date: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      response: 'json'
    })
    const url = `${this.twseURL}/afterTrading/FMTQIK?${query}`

    const response = await firstValueFrom(this.httpService.get(url))
    const json = response.data.stat === 'OK' && response.data
    if (!json) return null

    return json.data
      .map((row) => {
        const [year, month, day] = row[0].split('/')
        return {
          date: `${+year + 1911}-${month}-${day}`,
          tradeVolume: numeral(row[1]).value(),
          tradeValue: numeral(row[2]).value(),
          transaction: numeral(row[3]).value(),
          price: numeral(row[4]).value(),
          change: numeral(row[5]).value()
        }
      })
      .find((data) => data.date === date)
  }

  // 取得集中市場上漲及下跌家數
  async getCountsUpDown(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const query = new URLSearchParams({
      date: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      response: 'json'
    })
    const url = `${this.twseURL}/afterTrading/MI_INDEX?${query}`

    const response = await firstValueFrom(this.httpService.get(url))
    const json = response.data.stat === 'OK' && response.data
    if (!json) return null

    const raw = json.tables[7].data.map((row) => row[2])
    const [up, limitUp] = raw[0].replace(')', '').split('(')
    const [down, limitDown] = raw[1].replace(')', '').split('(')
    const [unchanged, unmatched, notApplicable] = raw.slice(2)

    return {
      date,
      up: numeral(up).value(),
      limitUp: numeral(limitUp).value(),
      down: numeral(down).value(),
      limitDown: numeral(limitDown).value(),
      unchanged: numeral(unchanged).value(),
      unmatched: numeral(unmatched).value() + numeral(notApplicable).value()
    }
  }

  // 取得集中市場三大法人買賣超
  async getThreeMajorInvestors(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const query = new URLSearchParams({
      dayDate: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      type: 'day',
      response: 'json'
    })
    const url = `${this.twseURL}/fund/BFI82U?${query}`

    const response = await firstValueFrom(this.httpService.get(url))
    const json = response.data.stat === 'OK' && response.data
    if (!json) return null

    const data = json.data
      .map((row) => row.slice(1))
      .flat()
      .map((row) => numeral(row).value())

    return {
      date,
      finiNetBuySell: data[11] + data[14],
      sitcNetBuySell: data[8],
      dealersNetBuySell: data[2] + data[5]
    }
  }

  // 取得集中市場融資融券餘額
  async getMarginTrading(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const query = new URLSearchParams({
      date: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      selectType: 'MS',
      response: 'json'
    })
    const url = `${this.twseURL}/marginTrading/MI_MARGN?${query}`

    const response = await firstValueFrom(this.httpService.get(url))
    const json = response.data.stat === 'OK' && response.data
    if (!json) return null

    const data = json.tables[0].data
      .map((data) => data.slice(1))
      .flat()
      .map((data) => numeral(data).value())

    return {
      date,
      marginBalance: data[4],
      marginBalanceChange: data[4] - data[3],
      marginBalanceValue: data[14],
      marginBalanceValueChange: data[14] - data[13],
      shortBalance: data[9],
      shortBalanceChange: data[9] - data[8]
    }
  }
}
