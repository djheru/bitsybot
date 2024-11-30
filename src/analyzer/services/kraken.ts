import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { DateTime } from "luxon";
import { KrakenOHLCVRow, OHLCDataInterval, PriceData } from "../types";

export class KrakenService {
  public lastResult: PriceData = {
    timestamp: [],
    open: [],
    high: [],
    low: [],
    close: [],
    vwap: [],
    volume: [],
    count: [],
  };
  public lastResultDate: DateTime;

  constructor(
    private readonly pair: string,
    private interval: OHLCDataInterval,
    private readonly logger: Logger,
    private readonly metrics: Metrics,
    private readonly totalPeriods: number
  ) {}

  async fetchPriceData(params?: {
    pair?: string;
    interval?: OHLCDataInterval;
    totalPeriods?: number;
  }): Promise<PriceData> {
    try {
      const queryInterval = params?.interval || this.interval || 15;
      const queryTotalPeriods =
        params?.totalPeriods || this.totalPeriods || 250;
      const url = "https://api.kraken.com/0/public/OHLC";
      const now = Date.now() / 1000;
      const since = now - queryInterval * 60 * queryTotalPeriods;
      const urlParams = new URLSearchParams({
        pair: params?.pair || this.pair,
        interval: `${params?.interval || this.interval}`, // Interval in minutes (e.g., 15 for 15-minute intervals)
        since: since.toString(),
      });

      const response = await fetch(`${url}?${urlParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error && data.error.length > 0) {
        this.logger.error("Error from Kraken API:", data.error);
        return this.lastResult;
      }

      this.metrics.addMetric("priceDataFetched", MetricUnit.Count, 1);

      const dataKey = Object.keys(data.result)
        .filter((key) => key !== "last")
        .pop();

      if (!dataKey) {
        this.logger.error("No OHLC data found");
        return this.lastResult;
      }

      const ohlcvData = data.result[dataKey] as KrakenOHLCVRow[];
      this.lastResult = this.formatPriceData(ohlcvData);
      return this.lastResult;
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

  getLastResult(): PriceData {
    return this.lastResult;
  }
}
