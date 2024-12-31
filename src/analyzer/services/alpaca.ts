import Alpaca from "@alpacahq/alpaca-trade-api";
import { CryptoBar } from "@alpacahq/alpaca-trade-api/dist/resources/datav2/entityv2";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { DateTime } from "luxon";
import {
  AccountBalances,
  AppSecret,
  MarketServiceProps,
  OHLCDataInterval,
  OrderBookData,
  PriceData,
} from "../types";

export class AlpacaService {
  public basePaperUrl: string = "https://paper-api.alpaca.markets/v2";
  public baseLiveUrl: string = "https://api.alpaca.markets/v2";
  public lastPriceData: PriceData = {
    timestamp: [],
    open: [],
    high: [],
    low: [],
    close: [],
    vwap: [],
    volume: [],
    count: [],
  };
  public lastOrderBook: OrderBookData = {
    asks: [],
    bids: [],
  };

  public lastAccountBalance: AccountBalances = {
    USDT: { balance: 0, holdTrade: 0 },
    XXBT: { balance: 0, holdTrade: 0 },
  };

  public pair: string;
  public interval: OHLCDataInterval;
  public logger: Logger;
  public metrics: Metrics;
  public totalPeriods: number;
  public secret: AppSecret;

  private alpaca: Alpaca;

  constructor(props: MarketServiceProps) {
    this.pair = props.pair;
    this.interval = props.interval;
    this.logger = props.logger;
    this.metrics = props.metrics;
    this.totalPeriods = props.totalPeriods;
    this.secret = props.secret;

    this.alpaca = new Alpaca({
      keyId: this.secret.MARKET_API_KEY,
      secretKey: this.secret.MARKET_SECRET_KEY,
      paper: this.secret.LIVE_OR_PAPER !== "live",
    });
  }

  async fetchPriceData(fetchPriceDataParams?: {
    pair?: string;
    interval?: OHLCDataInterval;
    totalPeriods?: number; // limit
  }): Promise<any> {
    try {
      const queryInterval =
        fetchPriceDataParams?.interval || this.interval || 15;
      const queryTotalPeriods =
        fetchPriceDataParams?.totalPeriods || this.totalPeriods || 250;
      const now = Date.now() / 1000;
      const since = now - queryInterval * 60 * queryTotalPeriods;
      console.log("Since:", since);

      const options = {
        start: DateTime.fromSeconds(since).toISO(),
        end: DateTime.fromSeconds(now).toISO(),
        limit: queryTotalPeriods,
        sort: "asc",
        timeframe: `${queryInterval}Min`,
      };
      const symbol = "BTC/USD";
      const response: Map<string, CryptoBar[]> =
        await this.alpaca.getCryptoBars([symbol], options);

      const result: PriceData = {
        timestamp: [],
        open: [],
        high: [],
        low: [],
        close: [],
        vwap: [],
        volume: [],
        count: [],
      };

      response.get(symbol)?.forEach((bar) => {
        result.timestamp.push(DateTime.fromISO(bar.Timestamp).toSeconds());
        result.open.push(bar.Open);
        result.high.push(bar.High);
        result.low.push(bar.Low);
        result.close.push(bar.Close);
        result.vwap.push(bar.VWAP);
        result.volume.push(bar.Volume);
        result.count.push(bar.TradeCount);
      });
      return result;
    } catch (error) {
      console.error("Error fetching OHLC data:", error);
      throw error;
    }
  }

  getLastPriceData(): PriceData {
    return this.lastPriceData;
  }

  // async fetchOrderBookData(
  //   pair: string,
  //   count: number = 10
  // ): Promise<OrderBookData> {}

  // async fetchBalance(): Promise<AccountBalances> {}
}
