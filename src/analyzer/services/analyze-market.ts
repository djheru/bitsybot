import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { ChatOpenAI } from "@langchain/openai";
import { randomUUID } from "crypto";
import { TrendIndicatorAgent } from "../agents/trend-indicator.agent";
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

    const trendIndicatorAgent = new TrendIndicatorAgent(
      this.symbol,
      this.interval,
      this.model,
      this.logger,
      this.metrics
    );
    const trendAnalysis = await trendIndicatorAgent.analyze(technicalData);

    this.logger.info("Trend analysis completed", { trendAnalysis });
  }
}
