import { z } from "zod";

export type Signal = "BUY" | "SELL" | "HOLD";

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

// Constants for analysis
export const ANALYSIS_TYPES = ["bollinger", "rsi", "trend"] as const;
export type AnalysisType = (typeof ANALYSIS_TYPES)[number];

// Configuration interfaces
export interface AnalysisConfig {
  minConfidenceThreshold: number;
  minDataPoints: number;
  maxDataPoints: number;
  requiredIndicators: AnalysisType[];
}

// Error types
export class ValidationError extends Error {
  constructor(message: string, public details: unknown) {
    super(message);
    this.name = "ValidationError";
  }
}

export class AnalysisError extends Error {
  constructor(
    message: string,
    public analysisType: AnalysisType,
    public details: unknown
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}
