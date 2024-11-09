import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { IndicatorResult, PriceData } from "../types";

export class TechnicalIndicatorService {
  // Configuration constants
  private static readonly TOTAL_PERIODS = 50;
  private static readonly BB_PERIOD = 20;
  private static readonly RSI_PERIOD = 14;
  private static readonly VOLUME_AVG_PERIOD = 20;
  private static readonly BB_STD_DEV = 2;

  constructor(
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {}

  private validateDataSize(
    data: PriceData[],
    requiredSize: number,
    indicatorName: string
  ) {
    if (data.length < requiredSize) {
      throw new Error(
        `Insufficient data for ${indicatorName}. Need at least ${requiredSize} periods, got ${data.length}`
      );
    }
  }

  // Calculate Bollinger Bands with history
  // Calculate Bollinger Bands
  calculateBollingerBands(data: PriceData[]): IndicatorResult {
    this.validateDataSize(
      data,
      TechnicalIndicatorService.BB_PERIOD,
      "Bollinger Bands"
    );

    const result: IndicatorResult = {
      name: "BollingerBands",
      current: {},
      history: {
        middle: [],
        upper: [],
        lower: [],
        price: [],
        bandwidth: [], // Adding bandwidth history for volatility analysis
      },
      metadata: {
        period: TechnicalIndicatorService.BB_PERIOD,
        standardDeviation: TechnicalIndicatorService.BB_STD_DEV,
      },
    };

    // We'll calculate for each point where we have enough previous data
    for (
      let i = TechnicalIndicatorService.BB_PERIOD - 1;
      i < data.length;
      i++
    ) {
      const slice = data.slice(
        i - TechnicalIndicatorService.BB_PERIOD + 1,
        i + 1
      );
      const closes = slice.map((d) => d.close);
      const timestamp = data[i].timestamp;

      const sma = this.calculateSMA(closes);
      const stdDev = this.calculateStandardDeviation(closes, sma);
      const upper = sma + TechnicalIndicatorService.BB_STD_DEV * stdDev;
      const lower = sma - TechnicalIndicatorService.BB_STD_DEV * stdDev;
      const bandwidth = (upper - lower) / sma;

      // Add to history
      result.history.middle.push({ timestamp, value: sma });
      result.history.upper.push({ timestamp, value: upper });
      result.history.lower.push({ timestamp, value: lower });
      result.history.price.push({ timestamp, value: data[i].close });
      result.history.bandwidth.push({ timestamp, value: bandwidth });

      // If this is the last point, set current values
      if (i === data.length - 1) {
        result.current = {
          middle: sma,
          upper: upper,
          lower: lower,
          price: data[i].close,
          bandwidth: bandwidth,
          percentB: ((data[i].close - lower) / (upper - lower)) * 100,
        };
      }
    }

    return result;
  }

  // Calculate RSI with history
  calculateRSI(data: PriceData[]): IndicatorResult {
    this.validateDataSize(
      data,
      TechnicalIndicatorService.RSI_PERIOD + 1,
      "RSI"
    );

    const result: IndicatorResult = {
      name: "RSI",
      current: {},
      history: {
        rsi: [],
        price: [],
        avgGain: [], // Adding gain/loss histories for trend analysis
        avgLoss: [],
      },
      metadata: {
        period: TechnicalIndicatorService.RSI_PERIOD,
      },
    };

    // Calculate initial gains and losses
    let gains: number[] = [];
    let losses: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate RSI for each point where we have enough data
    for (let i = TechnicalIndicatorService.RSI_PERIOD; i < gains.length; i++) {
      const gainsSlice = gains.slice(
        i - TechnicalIndicatorService.RSI_PERIOD,
        i
      );
      const lossesSlice = losses.slice(
        i - TechnicalIndicatorService.RSI_PERIOD,
        i
      );

      const avgGain = this.calculateSMA(gainsSlice);
      const avgLoss = this.calculateSMA(lossesSlice);

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      const timestamp = data[i + 1].timestamp; // +1 because gains/losses array starts one period later
      result.history.rsi.push({ timestamp, value: rsi });
      result.history.price.push({ timestamp, value: data[i + 1].close });
      result.history.avgGain.push({ timestamp, value: avgGain });
      result.history.avgLoss.push({ timestamp, value: avgLoss });

      // If this is the last point, set current values
      if (i === gains.length - 1) {
        result.current = {
          rsi: rsi,
          price: data[i + 1].close,
          avgGain: avgGain,
          avgLoss: avgLoss,
        };
      }
    }

    return result;
  }

  calculateVWAP(data: PriceData[]): IndicatorResult {
    this.validateDataSize(
      data,
      TechnicalIndicatorService.VOLUME_AVG_PERIOD,
      "VWAP"
    );

    const result: IndicatorResult = {
      name: "VWAP",
      current: {},
      history: {
        vwap: [],
        price: [],
        volume: [],
        relativeVolume: [], // Volume relative to moving average
      },
      metadata: {
        volumeAvgPeriod: TechnicalIndicatorService.VOLUME_AVG_PERIOD,
      },
    };

    // Calculate volume moving average for relative volume
    const volumeMA = this.calculateSMA(
      data
        .slice(-TechnicalIndicatorService.VOLUME_AVG_PERIOD)
        .map((d) => d.volume)
    );

    data.forEach((candle, index) => {
      const timestamp = candle.timestamp;

      // Add to history
      result.history.vwap.push({ timestamp, value: candle.vwap });
      result.history.price.push({ timestamp, value: candle.close });
      result.history.volume.push({ timestamp, value: candle.volume });
      result.history.relativeVolume.push({
        timestamp,
        value: candle.volume / volumeMA,
      });

      // If this is the last point, set current values
      if (index === data.length - 1) {
        result.current = {
          vwap: candle.vwap,
          price: candle.close,
          volume: candle.volume,
          relativeVolume: candle.volume / volumeMA,
          priceToVWAP: ((candle.close - candle.vwap) / candle.vwap) * 100,
        };
      }
    });

    return result;
  }

  private calculateSMA(data: number[]): number {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  private calculateStandardDeviation(data: number[], mean: number): number {
    const squaredDiffs = data.map((value) => Math.pow(value - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / data.length;
    return Math.sqrt(avgSquaredDiff);
  }

  // Get all indicators
  calculateAllIndicators(data: PriceData[]): IndicatorResult[] {
    this.logger.info("Calculating all indicators");
    this.validateDataSize(
      data,
      TechnicalIndicatorService.TOTAL_PERIODS,
      "Technical Analysis"
    );
    return [
      this.calculateBollingerBands(data),
      this.calculateRSI(data),
      this.calculateVWAP(data),
    ];
  }
}
