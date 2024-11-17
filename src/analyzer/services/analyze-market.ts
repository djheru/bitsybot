import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { ChatOpenAI } from "@langchain/openai";
import { randomUUID } from "crypto";
import {
  ATRAgent,
  BollingerBandsAgent,
  FinalAnalysisAgent,
  MACDAgent,
  RSIAgent,
  StochasticOscillatorAgent,
  VWAPAgent,
} from "../agents";
import { AnalysisRecord, IndicatorResult } from "../types";

export class AnalysisService {
  constructor(
    private readonly model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {}

  async analyzeMarket(
    technicalData: IndicatorResult[]
  ): Promise<AnalysisRecord> {
    const uuid = randomUUID();
    const timestamp = new Date().toISOString();
    const currentPrice = parseFloat(`${technicalData[0].current.price}`);
    const symbol = technicalData[0].symbol;
    const interval = technicalData[0].interval;

    const bbAgent = new BollingerBandsAgent(
      this.model,
      this.logger,
      this.metrics
    );
    const rsiAgent = new RSIAgent(this.model, this.logger, this.metrics);
    const vwapAgent = new VWAPAgent(this.model, this.logger, this.metrics);
    const macdAgent = new MACDAgent(this.model, this.logger, this.metrics);
    const stochAgent = new StochasticOscillatorAgent(
      this.model,
      this.logger,
      this.metrics
    );
    const atrAgent = new ATRAgent(this.model, this.logger, this.metrics);
    const finalAgent = new FinalAnalysisAgent(
      this.model,
      this.logger,
      this.metrics
    );

    // Get individual analyses
    const atrAnalysis = await atrAgent.analyze(technicalData[5]); // ATR
    const bbAnalysis = await bbAgent.analyze(technicalData[0]); // Bollinger Bands
    const macdAnalysis = await macdAgent.analyze(technicalData[3]); // MACD
    const rsiAnalysis = await rsiAgent.analyze(technicalData[1]); // RSI
    const stochAnalysis = await stochAgent.analyze(technicalData[4]); // Stochastic
    const vwapAnalysis = await vwapAgent.analyze(technicalData[2]); // VWAP

    // Get final analysis
    const finalAnalysis = await finalAgent.analyze({
      atrAnalysis,
      bbAnalysis,
      currentPrice,
      interval,
      macdAnalysis,
      rsiAnalysis,
      stochAnalysis,
      symbol,
      vwapAnalysis,
    });

    return {
      atrAnalysis,
      bbAnalysis,
      confidence: finalAnalysis.confidence,
      finalAnalysis,
      finalRecommendation: finalAnalysis.recommendation,
      interval,
      macdAnalysis,
      currentPrice,
      rsiAnalysis,
      stochAnalysis,
      symbol,
      timestamp,
      uuid,
      vwapAnalysis,
    };
  }
}
