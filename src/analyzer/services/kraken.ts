import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import * as crypto from "crypto";
import querystring from "querystring";
import {
  AccountBalances,
  AppSecret,
  KrakenOHLCVRow,
  KrakenOrderBook,
  KrakenOrderBookRow,
  MarketServiceProps,
  OHLCDataInterval,
  OrderBookData,
  PriceData,
} from "../types";

export class KrakenService {
  public baseUrl: string = "https://api.kraken.com";
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

  constructor(props: MarketServiceProps) {
    this.pair = props.pair;
    this.interval = props.interval;
    this.logger = props.logger;
    this.metrics = props.metrics;
    this.totalPeriods = props.totalPeriods;
    this.secret = props.secret;
  }

  async fetchPriceData(fetchPriceDataParams?: {
    pair?: string;
    interval?: OHLCDataInterval;
    totalPeriods?: number; // limit
  }): Promise<PriceData> {
    if (this.lastPriceData.timestamp.length > 0) {
      return this.lastPriceData;
    }
    try {
      const queryInterval =
        fetchPriceDataParams?.interval || this.interval || 15;
      const queryTotalPeriods =
        fetchPriceDataParams?.totalPeriods || this.totalPeriods || 250;
      const uriPath = "/0/public/OHLC";
      const url = `${this.baseUrl}${uriPath}`;
      const now = Date.now() / 1000;
      const since = now - queryInterval * 60 * queryTotalPeriods;

      const params = {
        pair: fetchPriceDataParams?.pair || this.pair,
        interval: `${fetchPriceDataParams?.interval || this.interval}`, // Interval in minutes (e.g., 15 for 15-minute intervals)
        since: since.toString(),
      };
      const urlParams = new URLSearchParams(params);

      const response = await fetch(`${url}?${urlParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error && data.error.length > 0) {
        this.logger.error("Error from Kraken API:", data.error);
        return this.lastPriceData;
      }

      this.metrics.addMetric("priceDataFetched", MetricUnit.Count, 1);
      if (!data.result || !data.result[params.pair]) {
        this.logger.error("No OHLC data found");
        return this.lastPriceData;
      }

      const ohlcvData = data.result[params.pair] as KrakenOHLCVRow[];
      this.lastPriceData = this.formatPriceData(ohlcvData);
      return this.lastPriceData;
    } catch (error) {
      console.error("Error fetching OHLC data:", error);
      throw error;
    }
  }

  /**
   * Converts Kraken OHLCV array format to an object with arrays for each field
   * @param ohlcvData Array of Kraken OHLCV data
   * @returns Object containing arrays for each OHLCV field
   */
  formatPriceData(ohlcvData: KrakenOHLCVRow[]): PriceData {
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

    ohlcvData.forEach(
      ([timestamp, open, high, low, close, vwap, volume, count]) => {
        result.timestamp.push(timestamp);
        result.open.push(parseFloat(open));
        result.high.push(parseFloat(high));
        result.low.push(parseFloat(low));
        result.close.push(parseFloat(close));
        result.vwap.push(parseFloat(vwap));
        result.volume.push(parseFloat(volume));
        result.count.push(count);
      }
    );
    return result;
  }

  getLastPriceData(): PriceData {
    return this.lastPriceData;
  }

  async fetchOrderBookData(
    pair: string,
    count: number = 10
  ): Promise<OrderBookData> {
    const uriPath = "/0/public/Depth";
    const url = `${this.baseUrl}${uriPath}`;
    const params = {
      pair,
      count: count.toString(),
    };
    const urlParams = new URLSearchParams(params);

    const response = await fetch(`${url}?${urlParams}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error && data.error.length > 0) {
      this.logger.error("Error from Kraken API:", data.error);
      return this.lastOrderBook;
    }

    this.metrics.addMetric("orderBookFetched", MetricUnit.Count, 1);
    if (!data.result || !data.result[params.pair]) {
      this.logger.error("No OHLC data found");
      return this.lastOrderBook;
    }

    const orderBookData = data.result[params.pair] as KrakenOrderBook;
    this.lastOrderBook = this.formatOrderBookData(orderBookData);
    return this.lastOrderBook;
  }

  formatOrderBookData(orderBookData: KrakenOrderBook): OrderBookData {
    const mapper = ([price, volume, timestamp]: KrakenOrderBookRow) => ({
      price: parseFloat(price),
      volume: parseFloat(volume),
      timestamp,
    });
    const result: OrderBookData = {
      asks: orderBookData.asks.map(mapper),
      bids: orderBookData.bids.map(mapper),
    };

    return result;
  }

  async fetchBalance(
    apiKey: string,
    apiSecretKey: string
  ): Promise<AccountBalances> {
    const nonce = Date.now().toString();
    const uriPath = "/0/private/BalanceEx";
    const url = `${this.baseUrl}${uriPath}`;
    const data = { nonce };
    const payload = JSON.stringify(data);
    const signature = this.getSignature(uriPath, payload, apiSecretKey);

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "API-Key": apiKey,
      "API-Sign": signature,
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payload,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    this.logger.info("Balance response", { responseData });

    if (responseData.error && responseData.error.length > 0) {
      this.logger.error("Error from Kraken API:", responseData.error);
      return this.lastAccountBalance;
    }
    this.metrics.addMetric("balanceFetched", MetricUnit.Count, 1);

    if (!responseData.result) {
      this.logger.error("No balance data found");
      return this.lastAccountBalance;
    }

    if (responseData.result.USDT) {
      const { balance = 0, hold_trade: holdTrade = 0 } =
        responseData.result.USDT;
      this.lastAccountBalance.USDT = { balance, holdTrade };
    }

    if (responseData.result.XXBT) {
      const { balance = 0, hold_trade: holdTrade = 0 } =
        responseData.result.XXBT;
      this.lastAccountBalance.XXBT = { balance, holdTrade };
    }
    return this.lastAccountBalance;
  }

  getSignature(urlPath: string, data: any, secret: string) {
    let encoded;
    if (typeof data === "string") {
      const jsonData = JSON.parse(data);
      encoded = jsonData.nonce + data;
    } else if (typeof data === "object") {
      const dataStr = querystring.stringify(data);
      encoded = data.nonce + dataStr;
    } else {
      throw new Error("Invalid data type");
    }

    const sha256Hash = crypto.createHash("sha256").update(encoded).digest();
    const message = urlPath + sha256Hash.toString("binary");
    const secretBuffer = Buffer.from(secret, "base64");
    const hmac = crypto.createHmac("sha512", secretBuffer);
    hmac.update(message, "binary");
    const signature = hmac.digest("base64");
    this.logger.info("Signature", { signature });
    return signature;
  }
}
