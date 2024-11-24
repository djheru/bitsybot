import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { ATR, EMA, MACD, RSI, SMA } from "trading-signals";
import {
  IndicatorResult,
  IndicatorResults,
  OHLCDataInterval,
  PriceData,
  VolumeAnalysis,
} from "../types";

export class TechnicalIndicatorService {
  // Configuration constants
  private static readonly RSI_PERIOD = 14;
  private static readonly MACD_FAST_PERIOD = 12;
  private static readonly MACD_SLOW_PERIOD = 26;
  private static readonly MACD_SIGNAL_PERIOD = 9;
  private static readonly ATR_PERIOD = 14; // Traditional ATR period
  private static readonly VOLUME_MA_PERIOD = 20;

  constructor(
    private readonly symbol: string,
    private readonly interval: OHLCDataInterval,
    private readonly logger: Logger,
    private readonly metrics: Metrics,
    private readonly totalPeriods: number
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

  calculateVolumeMetrics(data: PriceData[]): VolumeAnalysis {
    const volumeMA = new SMA(TechnicalIndicatorService.VOLUME_MA_PERIOD);

    for (const candle of data) {
      volumeMA.update(candle.volume);
    }

    const currentVolume = data[data.length - 1].volume;
    const averageVolume = Number(volumeMA.getResult().valueOf());

    return {
      currentVolume,
      averageVolume,
      relativeVolume: currentVolume / averageVolume,
      isHighVolume: currentVolume > averageVolume * 1.5,
    };
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
      symbol: this.symbol,
      interval: this.interval,
      current: {},
      history: {
        rsi: [],
        price: [],
        avgGain: [],
        avgLoss: [],
      },
      metadata: {
        period: TechnicalIndicatorService.RSI_PERIOD,
      },
    };

    // Initialize RSI indicator
    const rsi = new RSI(TechnicalIndicatorService.RSI_PERIOD);

    // Track gains and losses separately
    let gains: number[] = [];
    let losses: number[] = [];
    let prevClose = data[0].close;

    // Process each price point
    for (let i = 1; i < data.length; i++) {
      const price = data[i].close;
      const change = price - prevClose;

      // Calculate gain/loss for this period
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);

      // Update RSI with new price
      rsi.update(price);

      // Calculate average gain/loss for the period
      if (i >= TechnicalIndicatorService.RSI_PERIOD) {
        const periodGains = gains.slice(
          -1 * TechnicalIndicatorService.RSI_PERIOD
        );
        const periodLosses = losses.slice(
          -1 * TechnicalIndicatorService.RSI_PERIOD
        );

        const avgGain =
          periodGains.reduce((sum, g) => sum + g, 0) /
          TechnicalIndicatorService.RSI_PERIOD;
        const avgLoss =
          periodLosses.reduce((sum, l) => sum + l, 0) /
          TechnicalIndicatorService.RSI_PERIOD;

        // Add to history if we have enough data
        if (rsi.isStable) {
          const timestamp = data[i].timestamp;
          const rsiValue = Number(rsi.getResult().valueOf());

          result.history.rsi.push({ timestamp, value: rsiValue });
          result.history.price.push({ timestamp, value: price });
          result.history.avgGain.push({ timestamp, value: avgGain });
          result.history.avgLoss.push({ timestamp, value: avgLoss });

          // Set current values for the last point
          if (i === data.length - 1) {
            result.current = {
              rsi: rsiValue,
              price: price,
              avgGain: avgGain,
              avgLoss: avgLoss,
            };
          }
        }
      }

      prevClose = price;
    }

    return result;
  }

  calculateMACD(data: PriceData[]): IndicatorResult {
    this.validateDataSize(
      data,
      TechnicalIndicatorService.MACD_SLOW_PERIOD +
        TechnicalIndicatorService.MACD_SIGNAL_PERIOD,
      "MACD"
    );

    const result: IndicatorResult = {
      name: "MACD",
      symbol: this.symbol,
      interval: this.interval,
      current: {},
      history: {
        macdLine: [],
        signalLine: [],
        histogram: [],
        price: [],
      },
      metadata: {
        fastPeriod: TechnicalIndicatorService.MACD_FAST_PERIOD,
        slowPeriod: TechnicalIndicatorService.MACD_SLOW_PERIOD,
        signalPeriod: TechnicalIndicatorService.MACD_SIGNAL_PERIOD,
      },
    };

    // Initialize MACD indicator with EMA as the indicator type
    const macd = new MACD({
      longInterval: TechnicalIndicatorService.MACD_SLOW_PERIOD,
      shortInterval: TechnicalIndicatorService.MACD_FAST_PERIOD,
      signalInterval: TechnicalIndicatorService.MACD_SIGNAL_PERIOD,
      indicator: EMA,
    });

    // Rest of the code remains the same...
    for (let i = 0; i < data.length; i++) {
      const price = data[i].close;

      macd.update(price);

      if (macd.isStable) {
        const macdResult = macd.getResult();
        const timestamp = data[i].timestamp;

        const macdValue = Number(macdResult.macd.valueOf());
        const signalValue = Number(macdResult.signal.valueOf());
        const histogramValue = Number(macdResult.histogram.valueOf());

        result.history.macdLine.push({ timestamp, value: macdValue });
        result.history.signalLine.push({ timestamp, value: signalValue });
        result.history.histogram.push({ timestamp, value: histogramValue });
        result.history.price.push({ timestamp, value: price });

        if (i === data.length - 1) {
          result.current = {
            macdLine: macdValue,
            signalLine: signalValue,
            histogram: histogramValue,
            price: price,
          };
        }
      }
    }

    if (Object.keys(result.current).length === 0) {
      throw new Error(
        "Unable to calculate MACD: insufficient data points after calculations"
      );
    }

    return result;
  }

  calculateATR(data: PriceData[]): IndicatorResult {
    this.validateDataSize(data, TechnicalIndicatorService.ATR_PERIOD, "ATR");

    const result: IndicatorResult = {
      name: "ATR",
      symbol: this.symbol,
      interval: this.interval,
      current: {},
      history: {
        atr: [],
        price: [],
        trueRange: [], // Adding true range for additional context
        percentageATR: [], // ATR as percentage of price
      },
      metadata: {
        period: TechnicalIndicatorService.ATR_PERIOD,
      },
    };

    // Initialize ATR indicator
    const atr = new ATR(TechnicalIndicatorService.ATR_PERIOD);

    // Process each price point
    for (let i = 0; i < data.length; i++) {
      const candle = data[i];

      // Update ATR with high, low, close prices
      atr.update({
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });

      // Add to history if we have enough data
      if (atr.isStable) {
        const atrValue = Number(atr.getResult().valueOf());
        const timestamp = candle.timestamp;

        // Calculate True Range (it's one of: high-low, high-prevClose, low-prevClose)
        const prevClose = i > 0 ? data[i - 1].close : candle.close;
        const trueRange = Math.max(
          candle.high - candle.low,
          Math.abs(candle.high - prevClose),
          Math.abs(candle.low - prevClose)
        );

        // Calculate ATR as percentage of current price
        const percentageATR = (atrValue / candle.close) * 100;

        result.history.atr.push({ timestamp, value: atrValue });
        result.history.price.push({ timestamp, value: candle.close });
        result.history.trueRange.push({ timestamp, value: trueRange });
        result.history.percentageATR.push({ timestamp, value: percentageATR });

        // Set current values for the last point
        if (i === data.length - 1) {
          result.current = {
            atr: atrValue,
            price: candle.close,
            trueRange: trueRange,
            percentageATR: percentageATR,
            volatilityState: this.categorizeVolatility(percentageATR),
            averageRange: atrValue, // Useful for setting stops/targets
          };
        }
      }
    }

    if (Object.keys(result.current).length === 0) {
      throw new Error(
        "Unable to calculate ATR: insufficient data points after calculations"
      );
    }

    return result;
  }

  private isValidTradingPeriod(timestamp: number): boolean {
    const hour = new Date(timestamp).getUTCHours();

    // Avoid known low volume periods
    if (hour >= 22 || hour <= 2) return false;

    // Avoid typical high volatility periods
    if (hour === 8 || hour === 16) return false;

    return true;
  }

  // Helper method to categorize volatility levels
  private categorizeVolatility(
    percentageATR: number
  ): "LOW" | "MODERATE" | "HIGH" | "EXTREME" {
    // Tighter ranges for 5min timeframe
    if (percentageATR < 0.15) return "LOW";
    if (percentageATR < 0.3) return "MODERATE";
    if (percentageATR < 0.5) return "HIGH";
    return "EXTREME";
  }

  calculateIndicators(data: PriceData[]): IndicatorResults {
    this.logger.info("Calculating indicators", {
      dataPoints: data.length,
      symbol: this.symbol,
      interval: this.interval,
    });

    this.validateDataSize(data, this.totalPeriods, "Technical Analysis");

    // Check if it's a valid trading period
    const currentTimestamp = data[data.length - 1].timestamp;
    const isValidPeriod = this.isValidTradingPeriod(currentTimestamp);

    const volumeMetrics = this.calculateVolumeMetrics(data);

    return {
      rsiData: this.calculateRSI(data),
      macdData: this.calculateMACD(data),
      atrData: this.calculateATR(data),
      volumeMetrics,
      isValidPeriod,
      timestamp: currentTimestamp,
    };
  }
}
