import { PriceData } from "../types";

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface IndicatorResult {
  name: string;
  current: Record<string, number>;
  history: {
    [key: string]: TimeSeriesPoint[];
  };
  metadata?: Record<string, any>;
}

export class TechnicalIndicatorService {
  // Calculate Bollinger Bands with history
  calculateBollingerBands(
    data: PriceData[],
    period: number = 20,
    stdDev: number = 2
  ): IndicatorResult {
    const result: IndicatorResult = {
      name: "BollingerBands",
      current: {},
      history: {
        middle: [],
        upper: [],
        lower: [],
        price: [],
      },
      metadata: {
        period,
        standardDeviation: stdDev,
      },
    };

    // Need at least 'period' number of data points
    if (data.length < period) {
      throw new Error(
        `Insufficient data points. Need at least ${period} points.`
      );
    }

    // Calculate for each point where we have enough previous data
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const closes = slice.map((d) => d.close);
      const timestamp = data[i].timestamp;

      const sma = this.calculateSMA(closes);
      const stdDeviation = this.calculateStandardDeviation(closes, sma);
      const upper = sma + stdDev * stdDeviation;
      const lower = sma - stdDev * stdDeviation;

      // Add to history
      result.history.middle.push({ timestamp, value: sma });
      result.history.upper.push({ timestamp, value: upper });
      result.history.lower.push({ timestamp, value: lower });
      result.history.price.push({ timestamp, value: data[i].close });

      // If this is the last point, set it as current
      if (i === data.length - 1) {
        result.current = {
          middle: sma,
          upper: upper,
          lower: lower,
          price: data[i].close,
          bandWidth: (upper - lower) / sma, // Adding bandwidth as it's useful for volatility
          percentB: ((data[i].close - lower) / (upper - lower)) * 100, // Position within bands as percentage
        };
      }
    }

    return result;
  }

  // Calculate RSI with history
  calculateRSI(data: PriceData[], period: number = 14): IndicatorResult {
    const result: IndicatorResult = {
      name: "RSI",
      current: {},
      history: {
        rsi: [],
        price: [],
      },
      metadata: {
        period,
      },
    };

    if (data.length < period + 1) {
      throw new Error(
        `Insufficient data points. Need at least ${period + 1} points.`
      );
    }

    let gains: number[] = [];
    let losses: number[] = [];

    // Calculate initial gains and losses
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate RSI for each point where we have enough data
    for (let i = period; i < data.length; i++) {
      const gainsSlice = gains.slice(i - period, i);
      const lossesSlice = losses.slice(i - period, i);

      const avgGain = this.calculateSMA(gainsSlice);
      const avgLoss = this.calculateSMA(lossesSlice);

      const rs = avgGain / (avgLoss === 0 ? 0.00001 : avgLoss); // Avoid division by zero
      const rsi = 100 - 100 / (1 + rs);

      const timestamp = data[i].timestamp;
      result.history.rsi.push({ timestamp, value: rsi });
      result.history.price.push({ timestamp, value: data[i].close });

      // If this is the last point, set it as current
      if (i === data.length - 1) {
        result.current = {
          rsi: rsi,
          price: data[i].close,
        };
      }
    }

    return result;
  }

  // Helper methods remain the same
  private calculateSMA(data: number[]): number {
    const sum = data.reduce((a, b) => a + b, 0);
    return sum / data.length;
  }

  private calculateStandardDeviation(data: number[], mean: number): number {
    const squareDiffs = data.map((value) => Math.pow(value - mean, 2));
    const avgSquareDiff =
      squareDiffs.reduce((sum, diff) => sum + diff, 0) / data.length;
    return Math.sqrt(avgSquareDiff);
  }

  // Simplified VWAP tracking
  calculateVWAP(data: PriceData[]): IndicatorResult {
    const result: IndicatorResult = {
      name: "VWAP",
      current: {},
      history: {
        vwap: [],
        price: [],
        volumeProfile: [],
      },
      metadata: {
        period: data.length,
      },
    };

    // Calculate 20-period average volume for volume strength comparison
    const recentVolumes = data.slice(-20).map((d) => d.volume);
    const avgVolume =
      recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;

    data.forEach((candle, index) => {
      const timestamp = candle.timestamp;

      // Add to history
      result.history.vwap.push({ timestamp, value: candle.vwap });
      result.history.price.push({ timestamp, value: candle.close });
      result.history.volumeProfile.push({ timestamp, value: candle.volume });

      // If this is the last point, set current values
      if (index === data.length - 1) {
        result.current = {
          vwap: candle.vwap,
          price: candle.close,
          volume: candle.volume,
          priceToVWAP: ((candle.close - candle.vwap) / candle.vwap) * 100, // % difference from VWAP
          volumeStrength: candle.volume / avgVolume, // Current volume relative to 20-period average
        };
      }
    });

    return result;
  }

  // Get all indicators
  calculateAllIndicators(data: PriceData[]): IndicatorResult[] {
    return [
      this.calculateBollingerBands(data),
      this.calculateRSI(data),
      this.calculateVWAP(data),
    ];
  }
}
