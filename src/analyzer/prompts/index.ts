import { Signal } from "../types";
import { Analysis } from "./analysis-agent";
import { BollingerBands } from "./bollinger-bands-agent";
import { MACD } from "./macd-agent";
import { RSI } from "./rsi-agent";
import { VWAP } from "./vwap-agent";

export type EnabledPrompts =
  | "BollingerBands"
  | "RSI"
  | "VWAP"
  | "MACD"
  | "Analysis";

export interface PromptTemplate {
  system: string;
  human: string;
}

export type AnalysisPrompts = {
  [key in EnabledPrompts]: PromptTemplate;
};

export const Prompts: AnalysisPrompts = {
  Analysis,
  BollingerBands,
  MACD,
  RSI,
  VWAP,
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
