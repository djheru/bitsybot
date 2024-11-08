import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { createHash, createHmac } from "crypto";
import fetch from "node-fetch";
import { PriceData, PriceDataConfig } from "../types";

const logger = new Logger();
const metrics = new Metrics();

export class KrakenService {
  private readonly baseUrl = "https://api.kraken.com";
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  private async makeRequest(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    data: Record<string, any> = {}
  ): Promise<any> {
    try {
      metrics.addMetric("krakenApiRequests", MetricUnit.Count, 1);

      const path = `/0${endpoint}`;
      const nonce = Date.now().toString();

      // Prepare request data
      const requestData = {
        nonce,
        ...data,
      };

      // Create signature
      const signature = this.createSignature(path, nonce, data);

      // Make request
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "API-Key": this.apiKey,
          "API-Sign": signature,
          "Content-Type": "application/json",
        },
        body: method === "POST" ? JSON.stringify(requestData) : undefined,
      });

      if (!response.ok) {
        throw new Error(
          `Kraken API error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.error && result.error.length > 0) {
        throw new Error(`Kraken API error: ${result.error.join(", ")}`);
      }

      metrics.addMetric("krakenApiSuccess", MetricUnit.Count, 1);
      return result.result;
    } catch (error) {
      metrics.addMetric("krakenApiErrors", MetricUnit.Count, 1);
      logger.error("Kraken API request failed:", { error });
      throw error;
    }
  }

  private createSignature(
    path: string,
    nonce: string,
    data: Record<string, any>
  ): string {
    const message = nonce + JSON.stringify(data);
    const secret = Buffer.from(this.secretKey, "base64");

    const hash = createHash("sha256").update(message).digest();

    const hmac = createHmac("sha512", secret)
      .update(path + hash)
      .digest("base64");

    return hmac;
  }

  async getOHLCData(
    pair: string = "XXBTZUSD",
    interval: number = 60,
    since?: number
  ): Promise<PriceData[]> {
    try {
      logger.info("Fetching OHLC data", { pair, interval });
      metrics.addMetric("ohlcDataRequests", MetricUnit.Count, 1);

      const params: Record<string, any> = {
        pair,
        interval,
      };

      if (since) {
        params.since = since;
      }

      const data = await this.makeRequest("/public/OHLC", "GET", params);

      // Kraken returns data in arrays, transform to our PriceData format
      const ohlcData = data[pair].map((item: any[]) => ({
        timestamp: parseInt(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[6]),
      }));

      metrics.addMetric("ohlcDataSuccess", MetricUnit.Count, 1);
      logger.info("OHLC data fetched successfully", {
        count: ohlcData.length,
        firstTimestamp: ohlcData[0]?.timestamp,
        lastTimestamp: ohlcData[ohlcData.length - 1]?.timestamp,
      });

      return ohlcData;
    } catch (error) {
      metrics.addMetric("ohlcDataErrors", MetricUnit.Count, 1);
      logger.error("Failed to fetch OHLC data:", { error });
      throw error;
    }
  }

  async getTickerData(pair: string = "XXBTZUSD"): Promise<any> {
    try {
      logger.info("Fetching ticker data", { pair });
      metrics.addMetric("tickerDataRequests", MetricUnit.Count, 1);

      const data = await this.makeRequest("/public/Ticker", "GET", { pair });

      metrics.addMetric("tickerDataSuccess", MetricUnit.Count, 1);
      return data[pair];
    } catch (error) {
      metrics.addMetric("tickerDataErrors", MetricUnit.Count, 1);
      logger.error("Failed to fetch ticker data:", { error });
      throw error;
    }
  }

  async getRecentTrades(
    pair: string = "XXBTZUSD",
    since?: number
  ): Promise<any> {
    try {
      logger.info("Fetching recent trades", { pair });
      metrics.addMetric("recentTradesRequests", MetricUnit.Count, 1);

      const params: Record<string, any> = { pair };
      if (since) {
        params.since = since;
      }

      const data = await this.makeRequest("/public/Trades", "GET", params);

      metrics.addMetric("recentTradesSuccess", MetricUnit.Count, 1);
      return data;
    } catch (error) {
      metrics.addMetric("recentTradesErrors", MetricUnit.Count, 1);
      logger.error("Failed to fetch recent trades:", { error });
      throw error;
    }
  }
}

export const DEFAULT_CONFIG: PriceDataConfig = {
  pair: "XXBTZUSD",
  interval: 60, // 1 hour in minutes
  lookbackPeriods: 24, // Last 24 periods
};

// Function to initialize the service with secrets
export function createKrakenService(
  apiKey: string,
  secretKey: string
): KrakenService {
  return new KrakenService(apiKey, secretKey);
}

// Helper function to validate and transform Kraken data
export function validateKrakenResponse(data: any[]): boolean {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        Array.isArray(item) &&
        item.length >= 7 &&
        !isNaN(Number(item[0])) && // timestamp
        !isNaN(Number(item[1])) && // open
        !isNaN(Number(item[2])) && // high
        !isNaN(Number(item[3])) && // low
        !isNaN(Number(item[4])) && // close
        !isNaN(Number(item[6])) // volume
    )
  );
}
