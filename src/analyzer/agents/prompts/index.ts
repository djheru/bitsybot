import { Signal } from "../../types";
import { Analysis } from "./analysis-agent";
import { ATR } from "./atr-agent";
import { Candlestick } from "./candlestick";
import { MACD } from "./macd-agent";
import { Momentum } from "./momentum";
import { RSI } from "./rsi-agent";
import { Trend } from "./trend";
import { Volatility } from "./volatility";
import { Volume } from "./volume";

export type EnabledPrompts =
  | "Analysis"
  | "ATR"
  | "MACD"
  | "RSI"
  | "Trend"
  | "Momentum"
  | "Volatility"
  | "Volume"
  | "Candlestick";

export interface PromptTemplate {
  system: string;
  human: string;
}

export type AnalysisPrompts = {
  [key in EnabledPrompts]: PromptTemplate;
};

export const Prompts: AnalysisPrompts = {
  Analysis,
  ATR,
  MACD,
  RSI,
  Trend,
  Momentum,
  Volatility,
  Volume,
  Candlestick,
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
