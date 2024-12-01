import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { ChatOpenAI } from "@langchain/openai";
import { randomUUID } from "crypto";
import { CandlestickIndicatorAgent } from "../agents/candlestick-indicator.agent";
import { MomentumIndicatorAgent } from "../agents/momentum-indicator.agent";
import { TrendIndicatorAgent } from "../agents/trend-indicator.agent";
import { VolatilityIndicatorAgent } from "../agents/volatility-indicator.agent";
import { VolumeIndicatorAgent } from "../agents/volume-indicator.agent";
import { CalculatedIndicators, OHLCDataInterval } from "../types";

export class AnalysisService {
  constructor(
    private readonly symbol: string,
    private readonly interval: OHLCDataInterval,
    private readonly model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {}

  async analyzeMarket(technicalData: CalculatedIndicators) {
    const uuid = randomUUID();
    const timestamp = new Date().toISOString();

    const agents = [
      CandlestickIndicatorAgent,
      MomentumIndicatorAgent,
      TrendIndicatorAgent,
      VolatilityIndicatorAgent,
      VolumeIndicatorAgent,
    ];

    const [
      candlestickAnalysis,
      momentumAnalysis,
      trendAnalysis,
      volatilityAnalysis,
      volumeAnalysis,
    ] = await Promise.all(
      agents.map(async (Agent) => {
        const agent = new Agent(
          this.symbol,
          this.interval,
          this.model,
          this.logger,
          this.metrics
        );
        return await agent.analyze(technicalData);
      })
    );

    this.logger.info("Trend analysis completed", {
      candlestickAnalysis,
      momentumAnalysis,
      trendAnalysis,
      volatilityAnalysis,
      volumeAnalysis,
    });
  }
}
