import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { OHLCDataInterval, PriceData } from "../types";

export class KrakenService {
  public ANALYSIS_WINDOW = 50;
  constructor(
    private readonly symbol: string,
    private interval: OHLCDataInterval,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {}
  async fetchPriceData() {
    try {
      const url = "https://api.kraken.com/0/public/OHLC";
      const params = new URLSearchParams({
        pair: this.symbol,
        interval: `${this.interval}`, // Interval in minutes (e.g., 5 for 5-minute intervals)
        since: `${Date.now() - 86400000}`, // Fetch data from the last 24 hours
      });

      const response = await fetch(`${url}?${params}`);

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
        .slice(-this.ANALYSIS_WINDOW)
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
