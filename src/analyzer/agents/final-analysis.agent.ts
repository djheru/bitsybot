import { BaseAgent } from ".";
import { AnalysisRecord } from "../types";
import { Prompts, PromptTemplate } from "./prompts";

export class FinalAnalysisAgent extends BaseAgent {
  public prompts: PromptTemplate = Prompts.FinalAnalysis;

  getAnalysisCollationInput({
    candlestickAnalysis,
    ichimokuAnalysis,
    momentumAnalysis,
    trendAnalysis,
    volatilityAnalysis,
    volumeAnalysis,
  }: AnalysisRecord) {
    return {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      CANDLESTICK_RECOMMENDATION: candlestickAnalysis.recommendation,
      CANDLESTICK_CONFIDENCE: candlestickAnalysis.confidence,
      CANDLESTICK_RATIONALE: candlestickAnalysis.rationale,
      ICHIMOKU_RECOMMENDATION: ichimokuAnalysis.recommendation,
      ICHIMOKU_CONFIDENCE: ichimokuAnalysis.confidence,
      ICHIMOKU_RATIONALE: ichimokuAnalysis.rationale,
      MOMENTUM_RECOMMENDATION: momentumAnalysis.recommendation,
      MOMENTUM_CONFIDENCE: momentumAnalysis.confidence,
      MOMENTUM_RATIONALE: momentumAnalysis.rationale,
      TREND_RECOMMENDATION: trendAnalysis.recommendation,
      TREND_CONFIDENCE: trendAnalysis.confidence,
      TREND_RATIONALE: trendAnalysis.rationale,
      VOLATILITY_RECOMMENDATION: volatilityAnalysis.recommendation,
      VOLATILITY_CONFIDENCE: volatilityAnalysis.confidence,
      VOLATILITY_RATIONALE: volatilityAnalysis.rationale,
      VOLUME_RECOMMENDATION: volumeAnalysis.recommendation,
      VOLUME_CONFIDENCE: volumeAnalysis.confidence,
      VOLUME_RATIONALE: volumeAnalysis.rationale,
    };
  }
}
