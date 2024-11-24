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
    timestamp: z
      .number()
      .int()
      .positive()
      .lte(Date.now(), "Timestamp cannot be in the future"),
    open: z.number().positive(),
    high: z.number().positive(),
    low: z.number().positive(),
    close: z.number().positive(),
    volume: z.number().positive(),
    vwap: z.number().positive(),
  })
  .refine(
    (data) => data.high >= data.low,
    "High price must be greater than or equal to low price"
  )
  .refine(
    (data) => data.high >= data.open && data.high >= data.close,
    "High price must be the highest value"
  )
  .refine(
    (data) => data.low <= data.open && data.low <= data.close,
    "Low price must be the lowest value"
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

// TypeScript interfaces derived from Zod schemas
export type PriceData = z.infer<typeof PriceDataSchema>;
export type AnalysisSummary = z.infer<typeof AnalysisSummarySchema>;
export type AnalysisState = z.infer<typeof AnalysisStateSchema>;

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
