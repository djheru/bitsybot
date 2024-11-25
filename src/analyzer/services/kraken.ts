import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { OHLCDataInterval, PriceData } from "../types";

export class KrakenService {
  constructor(
    private readonly pair: string,
    private interval: OHLCDataInterval,
    private readonly logger: Logger,
    private readonly metrics: Metrics,
    private readonly totalPeriods: number
  ) {}
  async fetchPriceData(params?: {
    since?: number;
    pair?: string;
    interval?: OHLCDataInterval;
    totalPeriods?: number;
  }): Promise<PriceData[]> {
    try {
      const url = "https://api.kraken.com/0/public/OHLC";
      const urlParams = new URLSearchParams({
        pair: params?.pair || this.pair,
        interval: `${params?.interval || this.interval}`, // Interval in minutes (e.g., 15 for 15-minute intervals)
        since: `${params?.since || Date.now() - 86400000}`, // Fetch data from the last 24 hours by default
      });

      const response = await fetch(`${url}?${urlParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error && data.error.length > 0) {
        this.logger.error("Error from Kraken API:", data.error);
        return [];
      }

      this.metrics.addMetric("priceDataFetched", MetricUnit.Count, 1);

      const dataKey = Object.keys(data.result)
        .filter((key) => key !== "last")
        .pop();

      if (!dataKey) {
        this.logger.error("No OHLC data found");
        return [];
      }

      const ohlcData: Array<
        [number, string, string, string, string, string, string]
      > = data.result[dataKey];

      const priceData: PriceData[] = ohlcData
        .slice(-1 * (params?.totalPeriods || this.totalPeriods))
        .map((item) => ({
          timestamp: item[0],
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          vwap: parseFloat(item[5]),
          volume: parseFloat(item[6]),
        }));

      return priceData;
    } catch (error) {
      console.error("Error fetching OHLC data:", error);
      throw error;
    }
  }
}
