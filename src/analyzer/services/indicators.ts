import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import {
  ATR,
  BollingerBands,
  EMA,
  MACD,
  RSI,
  SMA,
  StochasticOscillator,
} from "trading-signals";
import { IndicatorResult, OHLCDataInterval, PriceData } from "../types";

export class TechnicalIndicatorService {
  // Configuration constants
  private static readonly BB_PERIOD = 20;
  private static readonly RSI_PERIOD = 14;
  private static readonly VOLUME_AVG_PERIOD = 20;
  private static readonly BB_STD_DEV = 2;
  private static readonly MACD_FAST_PERIOD = 12;
  private static readonly MACD_SLOW_PERIOD = 26;
  private static readonly MACD_SIGNAL_PERIOD = 9;
  private static readonly STOCH_K_PERIOD = 14; // %K period (m)
  private static readonly STOCH_K_SMOOTHING = 3; // %K smoothing (n)
  private static readonly STOCH_D_PERIOD = 3; // %D period (p)
  private static readonly ATR_PERIOD = 14; // Traditional ATR period
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

  calculateBollingerBands(data: PriceData[]): IndicatorResult {
    this.validateDataSize(
      data,
      TechnicalIndicatorService.BB_PERIOD,
      "Bollinger Bands"
    );

    const result: IndicatorResult = {
      name: "BollingerBands",
      symbol: this.symbol,
      interval: this.interval,
      current: {},
      history: {
        middle: [],
        upper: [],
        lower: [],
        price: [],
        bandwidth: [],
      },
      metadata: {
        period: TechnicalIndicatorService.BB_PERIOD,
        standardDeviation: TechnicalIndicatorService.BB_STD_DEV,
      },
    };

    // Initialize Bollinger Bands indicator
    const bb = new BollingerBands(
      TechnicalIndicatorService.BB_PERIOD,
      TechnicalIndicatorService.BB_STD_DEV
    );

    // Calculate for each point where we have enough data
    for (let i = 0; i < data.length; i++) {
      // Update the indicator with new price
      bb.update(data[i].close);

      // Only add to history if we have a result
      if (bb.isStable) {
        const bands = bb.getResult();
        const timestamp = data[i].timestamp;
        const middle = Number(bands.middle.valueOf());
        const upper = Number(bands.upper.valueOf());
        const lower = Number(bands.lower.valueOf());
        const bandwidth = (upper - lower) / middle;

        result.history.middle.push({ timestamp, value: middle });
        result.history.upper.push({ timestamp, value: upper });
        result.history.lower.push({ timestamp, value: lower });
        result.history.price.push({ timestamp, value: data[i].close });
        result.history.bandwidth.push({ timestamp, value: bandwidth });

        // Set current values for the last point
        if (i === data.length - 1) {
          result.current = {
            middle,
            upper,
            lower,
            price: data[i].close,
            bandwidth,
            percentB: ((data[i].close - lower) / (upper - lower)) * 100,
          };
        }
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

  calculateVWAP(data: PriceData[]): IndicatorResult {
    this.validateDataSize(
      data,
      TechnicalIndicatorService.VOLUME_AVG_PERIOD,
      "VWAP"
    );

    const result: IndicatorResult = {
      name: "VWAP",
      symbol: this.symbol,
      interval: this.interval,
      current: {},
      history: {
        vwap: [],
        price: [],
        volume: [],
        relativeVolume: [],
      },
      metadata: {
        volumeAvgPeriod: TechnicalIndicatorService.VOLUME_AVG_PERIOD,
      },
    };

    // Initialize SMA indicator for volume
    const volumeSMA = new SMA(TechnicalIndicatorService.VOLUME_AVG_PERIOD);
    let volumeMA = 0;

    data.forEach((candle, index) => {
      const timestamp = candle.timestamp;

      // Update volume SMA
      volumeSMA.update(candle.volume);

      // Get volume MA if we have enough data
      if (volumeSMA.isStable) {
        volumeMA = Number(volumeSMA.getResult().valueOf());
      }

      // Only start recording history once we have a valid volume MA
      if (volumeSMA.isStable) {
        const relativeVolume = candle.volume / volumeMA;

        result.history.vwap.push({ timestamp, value: candle.vwap });
        result.history.price.push({ timestamp, value: candle.close });
        result.history.volume.push({ timestamp, value: candle.volume });
        result.history.relativeVolume.push({
          timestamp,
          value: relativeVolume,
        });

        // If this is the last point, set current values
        if (index === data.length - 1) {
          result.current = {
            vwap: candle.vwap,
            price: candle.close,
            volume: candle.volume,
            relativeVolume: relativeVolume,
            priceToVWAP: ((candle.close - candle.vwap) / candle.vwap) * 100,
          };
        }
      }
    });

    if (Object.keys(result.current).length === 0) {
      throw new Error(
        "Unable to calculate VWAP: insufficient data points after calculations"
      );
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

  calculateStochastic(data: PriceData[]): IndicatorResult {
    this.validateDataSize(
      data,
      TechnicalIndicatorService.STOCH_K_PERIOD +
        TechnicalIndicatorService.STOCH_D_PERIOD,
      "Stochastic"
    );

    const result: IndicatorResult = {
      name: "Stochastic",
      symbol: this.symbol,
      interval: this.interval,
      current: {
        k: 0,
        d: 0,
        price: 0,
        isOverbought: false,
        isOversold: false,
        crossover: false,
      },
      history: {
        k: [], // Fast %K line
        d: [], // Slow %D line (signal)
        price: [],
      },
      metadata: {
        kPeriod: TechnicalIndicatorService.STOCH_K_PERIOD,
        dPeriod: TechnicalIndicatorService.STOCH_D_PERIOD,
      },
    };

    // Initialize Stochastic indicator
    const stoch = new StochasticOscillator(
      TechnicalIndicatorService.STOCH_K_PERIOD, // m: %K period
      TechnicalIndicatorService.STOCH_K_SMOOTHING, // n: %K smoothing
      TechnicalIndicatorService.STOCH_D_PERIOD // p: %D period
    );

    // Process each price point
    for (let i = 0; i < data.length; i++) {
      const candle = data[i];

      // Update with high, low, close prices
      stoch.update({
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });

      // Add to history if we have enough data
      if (stoch.isStable) {
        const stochResult = stoch.getResult();
        const timestamp = candle.timestamp;

        // Convert Big.js values to numbers
        const k = Number(stochResult.stochK.valueOf());
        const d = Number(stochResult.stochD.valueOf());

        result.history.k.push({ timestamp, value: k });
        result.history.d.push({ timestamp, value: d });
        result.history.price.push({ timestamp, value: candle.close });

        // Set current values for the last point
        if (i === data.length - 1) {
          result.current = {
            k: k,
            d: d,
            price: candle.close,
            isOverbought: k > 80, // Traditional overbought level
            isOversold: k < 20, // Traditional oversold level
            crossover: k > d, // True if %K crosses above %D
          };
        }
      }
    }

    // Check if we got any results
    if (Object.keys(result.current).length === 0) {
      throw new Error(
        "Unable to calculate Stochastic: insufficient data points after calculations"
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

  // Helper method to categorize volatility levels
  private categorizeVolatility(
    percentageATR: number
  ): "LOW" | "MODERATE" | "HIGH" | "EXTREME" {
    // These thresholds can be adjusted based on the specific asset
    if (percentageATR < 2) return "LOW";
    if (percentageATR < 4) return "MODERATE";
    if (percentageATR < 7) return "HIGH";
    return "EXTREME";
  }

  // Get all indicators
  calculateIndicators(data: PriceData[]): IndicatorResult[] {
    this.logger.info("Calculating all indicators");
    this.validateDataSize(data, this.totalPeriods, "Technical Analysis");
    return [
      this.calculateBollingerBands(data),
      this.calculateRSI(data),
      this.calculateVWAP(data),
      this.calculateMACD(data),
      this.calculateStochastic(data),
      this.calculateATR(data),
    ];
  }
}
