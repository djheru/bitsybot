import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import * as crypto from "crypto";
import {
  KrakenOHLCVRow,
  KrakenOrderBook,
  KrakenOrderBookRow,
  OHLCDataInterval,
  OrderBookData,
  PriceData,
} from "../types";

export class KrakenService {
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

  constructor(
    private readonly pair: string,
    private interval: OHLCDataInterval,
    private readonly logger: Logger,
    private readonly metrics: Metrics,
    private readonly totalPeriods: number,
    lastPriceData?: PriceData
  ) {
    if (lastPriceData) {
      this.lastPriceData = lastPriceData;
    }
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
      const url = "https://api.kraken.com/0/public/OHLC";
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
    const url = "https://api.kraken.com/0/public/Depth";
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

  getSignature(urlPath: string, data: any, secret: string) {
    let encoded;
    if (typeof data === "string") {
      encoded = JSON.parse(data);
    } else if (typeof data === "object") {
      const urlParams = new URLSearchParams(data);
      encoded = data.nonce + urlParams.toString();
    } else {
      throw new Error("Invalid data type");
    }

    const sha256Hash = crypto.createHash("sha256").update(encoded).digest();
    const message = urlPath + sha256Hash.toString("binary");
    const secretBuffer = Buffer.from(secret, "base64");
    const hmac = crypto.createHmac("sha512", secretBuffer);
    hmac.update(message, "binary");
    const signature = hmac.digest("base64");
    return signature;
  }
}
