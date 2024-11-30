import * as TechnicalIndicators from "technicalindicators";
import { ADXOutput } from "technicalindicators/declarations/directionalmovement/ADX";
import type { MACDOutput } from "technicalindicators/declarations/indicators";
import { StochasticOutput } from "technicalindicators/declarations/momentum/Stochastic";
import { BollingerBandsOutput } from "technicalindicators/declarations/volatility/BollingerBands";
import { PriceData } from "../types";

// export type PriceData = {
//   timestamp: number[];
//   open: number[];
//   high: number[];
//   low: number[];
//   close: number[];
//   vwap: number[];
//   volume: number[];
//   count: number[];
// };

// Constants for indicator inputs
const ADX_PERIOD = 10;
const ATR_PERIOD = 14;
const BOLLINGER_PERIOD = 20;
const BOLLINGER_STDDEV = 2;
const EMA_PERIOD = 12;
const MACD_FAST_PERIOD = 9;
const MACD_SIGNAL_PERIOD = 6;
const MACD_SLOW_PERIOD = 18;
const RSI_PERIOD = 12;
const STOCHASTIC_D = 3;
const STOCHASTIC_K = 10;
const WILLIAMS_R = 9;

// 1. Trend Following Indicator Tools
export const getEMA = (input: Pick<PriceData, "close">): number[] => {
  const ema = new TechnicalIndicators.EMA({
    values: input.close,
    period: EMA_PERIOD,
  });
  return ema.getResult();
};

export const getMACD = (input: Pick<PriceData, "close">): MACDOutput[] => {
  const macd = new TechnicalIndicators.MACD({
    values: input.close,
    fastPeriod: MACD_FAST_PERIOD,
    slowPeriod: MACD_SLOW_PERIOD,
    signalPeriod: MACD_SIGNAL_PERIOD,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  return macd.getResult();
};

export const getADX = (
  input: Pick<PriceData, "high" | "low" | "close">
): ADXOutput[] => {
  const adx = new TechnicalIndicators.ADX({
    high: input.high,
    low: input.low,
    close: input.close,
    period: ADX_PERIOD,
  });
  return adx.getResult();
};

// 2. Momentum Indicator Tools
export const getRSI = (input: Pick<PriceData, "close">): number[] => {
  const rsi = new TechnicalIndicators.RSI({
    values: input.close,
    period: RSI_PERIOD,
  });
  return rsi.getResult();
};

export const getStochastic = (
  input: Pick<PriceData, "high" | "low" | "close">
): StochasticOutput[] => {
  const stoch = new TechnicalIndicators.Stochastic({
    high: input.high,
    low: input.low,
    close: input.close,
    period: STOCHASTIC_K,
    signalPeriod: STOCHASTIC_D,
  });
  return stoch.getResult();
};

export const getWilliamsR = (
  input: Pick<PriceData, "high" | "low" | "close">
): number[] => {
  const williamsr = new TechnicalIndicators.WilliamsR({
    high: input.high,
    low: input.low,
    close: input.close,
    period: WILLIAMS_R,
  });
  return williamsr.getResult();
};

// 3. Volatility Indicator Tools
export const getBollingerBands = (
  input: Pick<PriceData, "close">
): BollingerBandsOutput[] => {
  const bb = new TechnicalIndicators.BollingerBands({
    values: input.close,
    period: BOLLINGER_PERIOD,
    stdDev: BOLLINGER_STDDEV,
  });
  return bb.getResult();
};

export const getATR = (input: Pick<PriceData, "high" | "low" | "close">) => {
  const atr = new TechnicalIndicators.ATR({
    high: input.high,
    low: input.low,
    close: input.close,
    period: ATR_PERIOD,
  });
  return atr.getResult();
};

// 4. Volume-Based Indicator Tools
export const getOBV = (
  input: Pick<PriceData, "volume" | "close">
): number[] => {
  const obv = new TechnicalIndicators.OBV({
    close: input.close,
    volume: input.volume,
  });
  return obv.getResult();
};

// 5. Candlestick Pattern Tools
export const getBullishEngulfing = (
  input: Pick<PriceData, "open" | "high" | "low" | "close">
): boolean => {
  return TechnicalIndicators.bullishengulfingpattern({
    open: input.open,
    high: input.high,
    low: input.low,
    close: input.close,
  });
};

export const getBearishEngulfing = (
  input: Pick<PriceData, "open" | "high" | "low" | "close">
): boolean => {
  return TechnicalIndicators.bearishengulfingpattern({
    open: input.open,
    high: input.high,
    low: input.low,
    close: input.close,
  });
};
