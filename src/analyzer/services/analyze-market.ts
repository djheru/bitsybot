import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { ChatOpenAI } from "@langchain/openai";
import {
  BollingerBandsAgent,
  FinalAnalysisAgent,
  MACDAgent,
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
    vwapAnalysis: IndicatorAnalysis;
    macdAnalysis: IndicatorAnalysis;
    finalAnalysis: IndicatorAnalysis;
  }> {
    const bbAgent = new BollingerBandsAgent(
      this.model,
      this.logger,
      this.metrics
    );
    const rsiAgent = new RSIAgent(this.model, this.logger, this.metrics);
    const vwapAgent = new VWAPAgent(this.model, this.logger, this.metrics);
    const macdAgent = new MACDAgent(this.model, this.logger, this.metrics);
    const finalAgent = new FinalAnalysisAgent(
      this.model,
      this.logger,
      this.metrics
    );

    // Get individual analyses
    const bbAnalysis = await bbAgent.analyze(technicalData[0]); // Bollinger Bands
    const rsiAnalysis = await rsiAgent.analyze(technicalData[1]); // RSI
    const vwapAnalysis = await vwapAgent.analyze(technicalData[2]); // VWAP
    const macdAnalysis = await macdAgent.analyze(technicalData[3]); // MACD

    // Get final analysis
    const finalAnalysis = await finalAgent.analyze(
      bbAnalysis,
      rsiAnalysis,
      macdAnalysis,
      vwapAnalysis,
      technicalData[0].current.price,
      technicalData[0].symbol
    );

    return {
      bbAnalysis,
      rsiAnalysis,
      vwapAnalysis,
      macdAnalysis,
      finalAnalysis,
    };
  }
}
