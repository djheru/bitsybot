import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { ChatOpenAI } from "@langchain/openai";
import { randomUUID } from "crypto";
import { ATRAgent, FinalAnalysisAgent, MACDAgent, RSIAgent } from "../agents";
import { AnalysisRecord, IndicatorResults } from "../types";

export class AnalysisService {
  constructor(
    private readonly model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {}

  async analyzeMarket(
    technicalData: IndicatorResults
  ): Promise<AnalysisRecord> {
    const uuid = randomUUID();
    const timestamp = new Date().toISOString();

    const { atrData, macdData, rsiData } = technicalData;
    const currentPrice = parseFloat(`${atrData.current.price}`);
    const symbol = atrData.symbol;

    const interval = atrData.interval;

    const rsiAgent = new RSIAgent(this.model, this.logger, this.metrics);
    const macdAgent = new MACDAgent(this.model, this.logger, this.metrics);
    const atrAgent = new ATRAgent(this.model, this.logger, this.metrics);

    const finalAgent = new FinalAnalysisAgent(
      this.model,
      this.logger,
      this.metrics
    );

    // Get individual analyses
    const atrAnalysis = await atrAgent.analyze(atrData); // ATR
    const macdAnalysis = await macdAgent.analyze(macdData); // MACD
    const rsiAnalysis = await rsiAgent.analyze(rsiData); // RSI

    // Get final analysis
    const finalAnalysis = await finalAgent.analyze({
      atrAnalysis,
      currentPrice,
      interval,
      macdAnalysis,
      rsiAnalysis,
      symbol,
    });

    return {
      atrAnalysis,
      confidence: finalAnalysis.confidence,
      finalAnalysis,
      finalRecommendation: finalAnalysis.recommendation,
      interval,
      macdAnalysis,
      currentPrice,
      rsiAnalysis,
      symbol,
      timestamp,
      uuid,
    };
  }
}
