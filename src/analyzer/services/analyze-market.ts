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
    const price = parseFloat(`${technicalData[0].current.price}`);
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
    const bollinger = await bbAgent.analyze(technicalData[0]); // Bollinger Bands
    const rsi = await rsiAgent.analyze(technicalData[1]); // RSI
    const vwap = await vwapAgent.analyze(technicalData[2]); // VWAP
    const macd = await macdAgent.analyze(technicalData[3]); // MACD
    const stoch = await stochAgent.analyze(technicalData[4]); // Stochastic
    const atr = await atrAgent.analyze(technicalData[5]); // ATR

    // Get final analysis
    const finalAnalysis = await finalAgent.analyze(
      bollinger,
      macd,
      rsi,
      stoch,
      vwap,
      atr,
      price,
      symbol,
      interval
    );

    return {
      uuid,
      timestamp,
      price,
      symbol,
      bollinger,
      rsi,
      vwap,
      stoch,
      macd,
      atr,
      finalAnalysis,
      finalRecommendation: finalAnalysis.recommendation,
      confidence: finalAnalysis.confidence,
      interval,
    };
  }
}
