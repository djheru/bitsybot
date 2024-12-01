import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import * as TechnicalIndicators from "technicalindicators";
import { ADXOutput } from "technicalindicators/declarations/directionalmovement/ADX";
import type { MACDOutput } from "technicalindicators/declarations/indicators";
import { StochasticOutput } from "technicalindicators/declarations/momentum/Stochastic";
import { BollingerBandsOutput } from "technicalindicators/declarations/volatility/BollingerBands";
import { CalculatedIndicators, OHLCDataInterval, PriceData } from "../types";
export class TechnicalIndicatorService {
  // Constants for indicator inputs
  public ADX_PERIOD = 10;
  public ATR_PERIOD = 14;
  public BOLLINGER_PERIOD = 20;
  public BOLLINGER_STDDEV = 2;
  public EMA_PERIOD = 12;
  public MACD_FAST_PERIOD = 9;
  public MACD_SIGNAL_PERIOD = 6;
  public MACD_SLOW_PERIOD = 18;
  public PSAR_STEP = 0.02;
  public PSAR_MAX = 0.2;
  public ROC_PERIOD = 12;
  public RSI_PERIOD = 12;
  public STOCHASTIC_D = 3;
  public STOCHASTIC_K = 10;
  public WILLIAMS_R = 9;

  constructor(
    private readonly symbol: string,
    private readonly interval: OHLCDataInterval,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {}

  // 1. Trend Following Indicator Tools
  getEMA(input: Pick<PriceData, "close">): number[] {
    const ema = new TechnicalIndicators.EMA({
      values: input.close,
      period: this.EMA_PERIOD,
    });
    return ema.getResult();
  }

  getMACD(input: Pick<PriceData, "close">): MACDOutput[] {
    const macd = new TechnicalIndicators.MACD({
      values: input.close,
      fastPeriod: this.MACD_FAST_PERIOD,
      slowPeriod: this.MACD_SLOW_PERIOD,
      signalPeriod: this.MACD_SIGNAL_PERIOD,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    return macd.getResult();
  }

  getADX(input: Pick<PriceData, "high" | "low" | "close">): ADXOutput[] {
    const adx = new TechnicalIndicators.ADX({
      high: input.high,
      low: input.low,
      close: input.close,
      period: this.ADX_PERIOD,
    });
    return adx.getResult();
  }

  // 2. Momentum Indicator Tools
  getRSI(input: Pick<PriceData, "close">): number[] {
    const rsi = new TechnicalIndicators.RSI({
      values: input.close,
      period: this.RSI_PERIOD,
    });
    return rsi.getResult();
  }

  getStochastic(
    input: Pick<PriceData, "high" | "low" | "close">
  ): StochasticOutput[] {
    const stoch = new TechnicalIndicators.Stochastic({
      high: input.high,
      low: input.low,
      close: input.close,
      period: this.STOCHASTIC_K,
      signalPeriod: this.STOCHASTIC_D,
    });
    return stoch.getResult();
  }

  getWilliamsR(input: Pick<PriceData, "high" | "low" | "close">): number[] {
    const williamsr = new TechnicalIndicators.WilliamsR({
      high: input.high,
      low: input.low,
      close: input.close,
      period: this.WILLIAMS_R,
    });
    return williamsr.getResult();
  }

  // 3. Volatility Indicator Tools
  getBollingerBands(input: Pick<PriceData, "close">): BollingerBandsOutput[] {
    const bb = new TechnicalIndicators.BollingerBands({
      values: input.close,
      period: this.BOLLINGER_PERIOD,
      stdDev: this.BOLLINGER_STDDEV,
    });
    return bb.getResult();
  }

  getATR(input: Pick<PriceData, "high" | "low" | "close">) {
    const atr = new TechnicalIndicators.ATR({
      high: input.high,
      low: input.low,
      close: input.close,
      period: this.ATR_PERIOD,
    });
    return atr.getResult();
  }

  getROC(input: Pick<PriceData, "close">): number[] {
    const roc = new TechnicalIndicators.ROC({
      values: input.close,
      period: this.ROC_PERIOD,
    });
    return roc.getResult();
  }

  getCCI(input: Pick<PriceData, "high" | "low" | "close">): number[] {
    const cci = new TechnicalIndicators.CCI({
      high: input.high,
      low: input.low,
      close: input.close,
      period: 20,
    });
    return cci.getResult();
  }

  getPSAR(input: Pick<PriceData, "high" | "low">): number[] {
    const psar = new TechnicalIndicators.PSAR({
      high: input.high,
      low: input.low,
      step: this.PSAR_STEP,
      max: this.PSAR_MAX,
    });
    return psar.getResult();
  }

  // 4. Volume-Based Indicator Tools
  getOBV(input: Pick<PriceData, "volume" | "close">): number[] {
    const obv = new TechnicalIndicators.OBV({
      close: input.close,
      volume: input.volume,
    });
    return obv.getResult();
  }

  getMFI(
    input: Pick<PriceData, "high" | "low" | "close" | "volume">
  ): number[] {
    const mfi = new TechnicalIndicators.MFI({
      high: input.high,
      low: input.low,
      close: input.close,
      volume: input.volume,
      period: 14,
    });
    return mfi.getResult();
  }

  getADL(
    input: Pick<PriceData, "high" | "low" | "close" | "volume">
  ): number[] {
    const adl = new TechnicalIndicators.ADL({
      high: input.high,
      low: input.low,
      close: input.close,
      volume: input.volume,
    });
    return adl.getResult();
  }

  getVWAP(
    input: Pick<PriceData, "high" | "low" | "close" | "volume">
  ): number[] {
    const vwap = new TechnicalIndicators.VWAP({
      high: input.high,
      low: input.low,
      close: input.close,
      volume: input.volume,
    });
    return vwap.getResult();
  }

  getForceIndex(input: Pick<PriceData, "close" | "volume">): number[] {
    const forceIndex = new TechnicalIndicators.ForceIndex({
      close: input.close,
      volume: input.volume,
      period: 13,
    });
    return forceIndex.getResult();
  }

  // 5. Candlestick Pattern Tools
  getBullishEngulfing(
    input: Pick<PriceData, "open" | "high" | "low" | "close">
  ): boolean {
    return TechnicalIndicators.bullishengulfingpattern({
      open: input.open,
      high: input.high,
      low: input.low,
      close: input.close,
    });
  }

  getBearishEngulfing(
    input: Pick<PriceData, "open" | "high" | "low" | "close">
  ): boolean {
    return TechnicalIndicators.bearishengulfingpattern({
      open: input.open,
      high: input.high,
      low: input.low,
      close: input.close,
    });
  }

  calculateIndicators(priceData: PriceData): CalculatedIndicators {
    return {
      // Trend Following Indicators
      ema: this.getEMA(priceData),
      macd: this.getMACD(priceData),
      adx: this.getADX(priceData),
      // Momentum Indicators
      rsi: this.getRSI(priceData),
      stochastic: this.getStochastic(priceData),
      williamsR: this.getWilliamsR(priceData),
      // Volatility Indicators
      bollingerBands: this.getBollingerBands(priceData),
      atr: this.getATR(priceData),
      roc: this.getROC(priceData),
      cci: this.getCCI(priceData),
      psar: this.getPSAR(priceData),
      // Volume-Based Indicators
      obv: this.getOBV(priceData),
      mfi: this.getMFI(priceData),
      adl: this.getADL(priceData),
      vwap: this.getVWAP(priceData),
      forceIndex: this.getForceIndex(priceData),
      // Candlestick Patterns
      bullishEngulfing: this.getBullishEngulfing(priceData),
      bearishEngulfing: this.getBearishEngulfing(priceData),
    };
  }
}
