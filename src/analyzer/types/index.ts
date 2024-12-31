import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { z } from "zod";

export type Signal = "BUY" | "SELL" | "HOLD";

type AccountBalanceAssets = "USDT" | "XXBT";

export type AccountBalances = {
  [key in AccountBalanceAssets]: { balance: number; holdTrade: number };
};

export interface AppSecret {
  CONFIDENCE_THRESHOLD: number;
  MARKET_API_KEY: string;
  MARKET_SECRET_KEY: string;
  LLM_API_KEY: string;
  LLM_MODEL_NAME: string;
  SERVICE_NAME: string;
  SLACK_TOKEN: string;
  SLACK_CHANNEL: string;
  STRIPE_PRODUCT_PRICE_ID_LG: string;
  STRIPE_PRODUCT_PRICE_ID_MD: string;
  STRIPE_PRODUCT_PRICE_ID_SM: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  TIMEFRAME_INTERVAL: number;
  TOTAL_PERIODS: number;
  LIVE_OR_PAPER: "live" | "paper";
}

export const OrderBookSchema = z.object({
  asks: z.array(
    z.object({ price: z.number(), volume: z.number(), timestamp: z.number() })
  ),
  bids: z.array(
    z.object({ price: z.number(), volume: z.number(), timestamp: z.number() })
  ),
});
// Zod schema for runtime validation
export const PriceDataSchema = z
  .object({
    timestamp: z.array(z.number().int().positive()),
    open: z.array(z.number().positive()),
    high: z.array(z.number().positive()),
    low: z.array(z.number().positive()),
    close: z.array(z.number().positive()),
    volume: z.array(z.number().positive()),
    vwap: z.array(z.number().positive()),
    count: z.array(z.number().int().positive()),
  })
  .refine(
    (data) =>
      data.high.length === data.low.length &&
      data.high.length === data.open.length &&
      data.high.length === data.close.length &&
      data.high.length === data.volume.length &&
      data.high.length === data.vwap.length &&
      data.high.length === data.timestamp.length &&
      data.high.length === data.count.length,
    "All arrays must have the same length"
  )
  .refine(
    (data) => data.high.every((value, i) => value >= data.low[i]),
    "High price must be greater than or equal to low price for each entry"
  )
  .refine(
    (data) =>
      data.high.every(
        (value, i) => value >= data.open[i] && value >= data.close[i]
      ),
    "High price must be the highest value for each entry"
  )
  .refine(
    (data) =>
      data.low.every(
        (value, i) => value <= data.open[i] && value <= data.close[i]
      ),
    "Low price must be the lowest value for each entry"
  );

export const AnalysisSummarySchema = z.object({
  signal: z.enum(["BUY", "SELL", "HOLD"]),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score between 0 and 1"),
  reasoning: z
    .string()
    .min(10)
    .max(1000)
    .describe("Explanation of the analysis"),
});

export const AnalysisStateSchema = z.object({
  price_data: z
    .array(PriceDataSchema)
    .min(1, "At least one price data point is required")
    .max(1000, "Too many price data points"),
  analyses: z.object({
    bollinger: AnalysisSummarySchema.optional(),
    rsi: AnalysisSummarySchema.optional(),
    trend: AnalysisSummarySchema.optional(),
  }),
  final_recommendation: AnalysisSummarySchema.optional(),
});

export const CalculatedIndicatorsSchema = z.object({
  close: z.array(z.number()), // Close prices
  // Trend Indicators
  ema: z.array(z.number()), // EMA values must be an array of numbers
  macd: z.array(
    z.object({
      MACD: z.number().optional(), // MACD Line
      signal: z.number().optional(), // Signal Line
      histogram: z.number().optional(), // MACD Histogram
    })
  ),
  adx: z.array(
    z.object({
      adx: z.number(), // Average Directional Index
      mdi: z.number(), // Minus Directional Indicator
      pdi: z.number(), // Plus Directional Indicator
    })
  ),

  // Momentum Indicators
  rsi: z.array(z.number()), // RSI values
  stochastic: z.array(
    z.object({
      k: z.number().optional(), // %K Line
      d: z.number().optional(), // %D Line
    })
  ),
  williamsR: z.array(z.number()), // Williams %R values

  // Volatility Indicators
  bollingerBands: z.array(
    z.object({
      lower: z.number(), // Lower Band
      middle: z.number(), // Middle Band
      upper: z.number(), // Upper Band
    })
  ),
  atr: z.array(z.number()), // ATR values
  roc: z.array(z.number()), // Rate of Change values
  cci: z.array(z.number()), // Commodity Channel Index values
  psar: z.array(z.number()), // Parabolic SAR values

  // Volume-Based Indicators
  obv: z.array(z.number()), // On-Balance Volume values
  mfi: z.array(z.number()), // Money Flow Index values
  adl: z.array(z.number()), // Accumulation/Distribution Line values
  vwap: z.array(z.number()), // Volume Weighted Average Price values
  forceIndex: z.array(z.number()), // Force Index values

  // Candlestick Patterns
  bullishEngulfing: z.boolean(), // Boolean for Bullish pattern presence
  morningStar: z.boolean(), // Boolean for Morning Star pattern presence
  hammer: z.boolean(), // Boolean for Hammer pattern presence
  threeWhiteSoldiers: z.boolean(), // Boolean for Three White Soldiers pattern presence
  bearishEngulfing: z.boolean(), // Boolean for Bearish pattern presence
  eveningStar: z.boolean(), // Boolean for Evening Star pattern presence
  shootingStar: z.boolean(), // Boolean for Shooting Star pattern presence
  threeBlackCrows: z.boolean(), // Boolean for Three Black Crows pattern presence
  doji: z.boolean(), // Boolean for Doji pattern presence
  dragonflyDoji: z.boolean(), // Boolean for Dragonfly Doji pattern presence
  gravestoneDoji: z.boolean(), // Boolean for Gravestone Doji pattern presence

  // Ichimoku Cloud
  ichimokuCloud: z.array(
    z.object({
      conversion: z.number(), // Conversion Line
      base: z.number(), // Base Line
      spanA: z.number(), // Span A
      spanB: z.number(), // Span B
    })
  ),
});

// TypeScript interfaces derived from Zod schemas
export type OrderBookData = z.infer<typeof OrderBookSchema>;
export type PriceData = z.infer<typeof PriceDataSchema>;
export type AnalysisSummary = z.infer<typeof AnalysisSummarySchema>;
export type AnalysisState = z.infer<typeof AnalysisStateSchema>;
export type CalculatedIndicators = z.infer<typeof CalculatedIndicatorsSchema>;

// Helper functions for validation
export function validatePriceData(data: unknown): PriceData[] {
  if (!Array.isArray(data)) {
    throw new Error("Price data must be an array");
  }
  return data.map((item) => PriceDataSchema.parse(item));
}

export function validateAnalysisSummary(summary: unknown): AnalysisSummary {
  return AnalysisSummarySchema.parse(summary);
}

export function validateAnalysisState(state: unknown): AnalysisState {
  return AnalysisStateSchema.parse(state);
}

export interface MarketServiceProps {
  pair: string;
  interval: OHLCDataInterval;
  logger: Logger;
  metrics: Metrics;
  totalPeriods: number;
  secret: AppSecret;
}

// Output type for the Kraken API
export type KrakenOHLCVRow = [
  timestamp: number, // Time
  open: string, // Open price
  high: string, // High price
  low: string, // Low price
  close: string, // Close price
  vwap: string, // Volume weighted average price
  volume: string, // Volume
  count: number // Number of trades
];

export type KrakenOrderBookRow = [
  price: string, // Price level
  volume: string, // Volume at that price
  timestamp: number // Time of the order
];

export type KrakenOrderBook = {
  asks: KrakenOrderBookRow[];
  bids: KrakenOrderBookRow[];
};

// Types for agent outputs
export interface IndicatorAnalysis {
  recommendation?: Signal;
  confidence: number;
  rationale: string;
}
export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface VolumeAnalysis {
  currentVolume: number;
  averageVolume: number;
  relativeVolume: number;
  isHighVolume: boolean;
}

export interface IndicatorResult {
  name: string;
  symbol: string;
  interval: OHLCDataInterval;
  current: Record<string, number | string | boolean>;
  history: {
    [key: string]: TimeSeriesPoint[];
  };
  metadata?: Record<string, any>;
}

export interface IndicatorResults {
  rsiData: IndicatorResult;
  macdData: IndicatorResult;
  atrData: IndicatorResult;
  volumeMetrics: VolumeAnalysis;
  isValidPeriod: boolean;
  timestamp: number;
}

export interface AnalysisEntryPosition {
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  stopLossPercentage?: number;
  positionSize?: number;
  rationale: string;
  recommendation?: Signal;
  confidence?: number;
  riskPercent?: number;
  rewardPercent?: number;
  rrRatio?: number;
}
export interface AnalysisRecord {
  uuid: string;
  timestamp: string; // Sort Key
  symbol: string; // Partition Key
  interval: OHLCDataInterval;
  currentPrice: number;

  recommendation?: Signal;
  confidence?: number;
  rationale?: string;

  candlestickAnalysis: IndicatorAnalysis;
  ichimokuAnalysis: IndicatorAnalysis;
  momentumAnalysis: IndicatorAnalysis;
  trendAnalysis: IndicatorAnalysis;
  volatilityAnalysis: IndicatorAnalysis;
  volumeAnalysis: IndicatorAnalysis;

  entryPosition?: AnalysisEntryPosition;

  ttl?: number; // TTL in seconds since epoch
  evaluation?: EvaluationResult;
}

// Define allowed intervals as a constant array and infer the type
export const allowedIntervalsArray = [
  1, 5, 15, 30, 60, 240, 1440, 10080, 21600,
] as const;

// Derive the type directly from the array
export type OHLCDataInterval = (typeof allowedIntervalsArray)[number];

// Convert to a Set for faster lookups
const allowedIntervals = new Set<number>(allowedIntervalsArray);

// Validation function using the Set
export function isValidOHLCDataInterval(
  value: number
): value is OHLCDataInterval {
  return allowedIntervals.has(value);
}

export type EvaluationOutcome = "success" | "failure" | "neutral";

export interface EvaluationResult {
  confidence?: number;
  currentPrice: number;
  details: string; // Explanation of the result
  interval: OHLCDataInterval;
  outcome: EvaluationOutcome;
  recommendation?: Signal;
  symbol: string;
  timestamp: string;
  uuid: string;
  ttl?: number; // TTL in seconds since epoch
  maxClose?: number;
  minClose?: number;
}

export interface EvaluationSummaryResult {
  symbol: string;
  interval: OHLCDataInterval;
  timestamp: string;
  uuid: string;
  BUY: {
    success: number;
    failure: number;
    neutral: number;
    successRate: number;
    failureRate: number;
    total: number;
  };
  SELL: {
    success: number;
    failure: number;
    neutral: number;
    successRate: number;
    failureRate: number;
    total: number;
  };
  HOLD: {
    success: number;
    failure: number;
    neutral: number;
    successRate: number;
    failureRate: number;
    total: number;
  };
  total: number;
  range: {
    from: string;
    to: string;
  };
  formattedSummary: string;
}
