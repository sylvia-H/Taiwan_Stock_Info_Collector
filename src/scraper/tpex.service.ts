import * as numeral from 'numeral'
import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { firstValueFrom } from 'rxjs'
import { DateTime } from 'luxon'

@Injectable()
export class TpexService {
  private readonly tpexURL: string

  constructor(private httpService: HttpService) {
    this.tpexURL = 'https://www.tpex.org.tw/web/stock'
  }

  // 取得指定日期的櫃買市場成交資訊
  async getTradesInfo(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const [year, month, day] = date.split('-')
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      o: 'json'
    })
    const url = `${this.tpexURL}/aftertrading/daily_trading_index/st41_result.php?${query}`

    const response = await firstValueFrom(this.httpService.get(url))
    const json = response.data.iTotalRecords > 0 && response.data
    if (!json) return null

    return json.aaData
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

  // 取得櫃買市場上漲及下跌家數
  async getCountsUpDown(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const [year, month, day] = date.split('-')
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      o: 'json'
    })
    const url = `${this.tpexURL}/aftertrading/market_highlight/highlight_result.php?${query}`

    const response = await firstValueFrom(this.httpService.get(url))
    const json = response.data.iTotalRecords > 0 && response.data
    if (!json) return null

    return {
      date,
      up: numeral(json.upNum).value(),
      limitUp: numeral(json.upStopNum).value(),
      down: numeral(json.downNum).value(),
      limitDown: numeral(json.downStopNum).value(),
      unchanged: numeral(json.noChangeNum).value(),
      unmatched: numeral(json.noTradeNum).value()
    }
  }

  // 取得櫃買市場三大法人買賣超
  async getThreeMajorInvestors(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const [year, month, day] = date.split('-')
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      t: 'D',
      o: 'json'
    })
    const url = `${this.tpexURL}/3insti/3insti_summary/3itrdsum_result.php?${query}`

    const response = await firstValueFrom(this.httpService.get(url))
    const json = response.data.iTotalRecords > 0 && response.data
    if (!json) return null

    const data = json.aaData
      .map((row) => row.slice(1))
      .flat()
      .map((row) => numeral(row).value())

    return {
      date,
      finiNetBuySell: data[2],
      sitcNetBuySell: data[11],
      dealersBuySell: data[14]
    }
  }

  // 取得櫃買市場融資融券餘額
  async getMarginTrading(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate()
    const [year, month, day] = date.split('-')
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      o: 'json'
    })
    const url = `${this.tpexURL}/margin_trading/margin_balance/margin_bal_result.php?${query}`

    const response = await firstValueFrom(this.httpService.get(url))
    const json = response.data.iTotalRecords > 0 && response.data
    if (!json) return null

    const data = [...json.tfootData_one, ...json.tfootData_two]
      .map((row) => numeral(row).value())
      .filter((row) => row)

    return {
      date,
      marginBalance: data[4],
      marginBalanceChange: data[4] - data[0],
      marginBalanceValue: data[14],
      marginBalanceValueChange: data[14] - data[10],
      shortBalance: data[9],
      shortBalanceChange: data[9] - data[5]
    }
  }
}
