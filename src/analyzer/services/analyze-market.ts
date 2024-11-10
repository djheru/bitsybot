import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { ChatOpenAI } from "@langchain/openai";
import {
  BollingerBandsAgent,
  FinalAnalysisAgent,
  RSIAgent,
  VWAPAgent,
} from "../services/agents";
import { IndicatorAnalysis, IndicatorResult } from "../types";

export class AnalysisService {
  constructor(
    private readonly model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {}

  async analyzeMarket(technicalData: IndicatorResult[]): Promise<{
    bbAnalysis: IndicatorAnalysis;
    rsiAnalysis: IndicatorAnalysis;
    finalAnalysis: IndicatorAnalysis;
  }> {
    const bbAgent = new BollingerBandsAgent(
      this.model,
      this.logger,
      this.metrics
    );
    const rsiAgent = new RSIAgent(this.model, this.logger, this.metrics);
    const vwapAgent = new VWAPAgent(this.model, this.logger, this.metrics);
    const finalAgent = new FinalAnalysisAgent(
      this.model,
      this.logger,
      this.metrics
    );

    // Get individual analyses
    const bbAnalysis = await bbAgent.analyze(technicalData[0]); // Bollinger Bands
    const rsiAnalysis = await rsiAgent.analyze(technicalData[1]); // RSI
    const vwapAnalysis = await vwapAgent.analyze(technicalData[2]); // VWAP

    // Get final analysis
    const finalAnalysis = await finalAgent.analyze(
      bbAnalysis,
      rsiAnalysis,
      vwapAnalysis,
      technicalData[0].current.price
    );

    return {
      bbAnalysis,
      rsiAnalysis,
      finalAnalysis,
    };
  }
}
