import { Signal } from "../../types";
import { Candlestick } from "./candlestick";
import { EntryPosition } from "./entry-position";
import { FinalAnalysis } from "./final-analysis";
import { Momentum } from "./momentum";
import { Trend } from "./trend";
import { Volatility } from "./volatility";
import { Volume } from "./volume";

export type EnabledPrompts =
  | "Candlestick"
  | "EntryPosition"
  | "FinalAnalysis"
  | "Momentum"
  | "Trend"
  | "Volatility"
  | "Volume";

export interface PromptTemplate {
  system: string;
  human: string;
  type?: string;
}

export type AnalysisPrompts = {
  [key in EnabledPrompts]: PromptTemplate;
};

export const Prompts: AnalysisPrompts = {
  Candlestick,
  EntryPosition,
  FinalAnalysis,
  Momentum,
  Trend,
  Volatility,
  Volume,
};

// Helper function to format price data for prompts
export const formatPriceData = (data: any) => {
  return JSON.stringify(data, null, 2);
};

// Helper function to format analyses for meta-analysis
export const formatAnalyses = (analyses: any) => {
  return JSON.stringify(analyses, null, 2);
};

// Response parser helper
export const parseAnalysisResponse = (
  response: string
): {
  signal: Signal;
  confidence: number;
  reasoning: string;
} => {
  try {
    const parsed = JSON.parse(response);
    return {
      signal: parsed.signal,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    throw new Error(`Failed to parse analysis response: ${error}`);
  }
};
