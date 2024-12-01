import { z } from "zod";

export type Signal = "BUY" | "SELL" | "HOLD";

export interface AppSecret {
  CONFIDENCE_THRESHOLD: number;
  KRAKEN_API_KEY: string;
  KRAKEN_SECRET_KEY: string;
  OPENAI_API_KEY: string;
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
}
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
      k: z.number(), // %K Line
      d: z.number(), // %D Line
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
  bullish: z.boolean(), // Boolean for Bullish pattern presence
  bearish: z.boolean(), // Boolean for Bearish pattern presence
});

// TypeScript interfaces derived from Zod schemas
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

// Types for agent outputs
export interface IndicatorAnalysis {
  recommendation: "BUY" | "SELL" | "HOLD";
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
export interface AnalysisRecord {
  atrAnalysis: IndicatorAnalysis;
  confidence: number;
  finalAnalysis: IndicatorAnalysis;
  finalRecommendation: Signal;
  interval: OHLCDataInterval;
  macdAnalysis: IndicatorAnalysis;
  currentPrice: number;
  rsiAnalysis: IndicatorAnalysis;
  symbol: string; // Partition Key
  timestamp: string; // Sort Key
  ttl?: number; // TTL in seconds since epoch
  uuid: string;
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
