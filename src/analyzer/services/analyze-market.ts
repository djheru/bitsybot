import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { ChatOpenAI } from "@langchain/openai";
import { randomUUID } from "crypto";
import { CandlestickIndicatorAgent } from "../agents/candlestick-indicator.agent";
import { EntryPositionAgent } from "../agents/entry-position.agent";
import { FinalAnalysisAgent } from "../agents/final-analysis.agent";
import { IchimokuIndicatorAgent } from "../agents/ichimoku-indicator.agent";
import { MomentumIndicatorAgent } from "../agents/momentum-indicator.agent";
import { TrendIndicatorAgent } from "../agents/trend-indicator.agent";
import { VolatilityIndicatorAgent } from "../agents/volatility-indicator.agent";
import { VolumeIndicatorAgent } from "../agents/volume-indicator.agent";
import {
  AnalysisRecord,
  CalculatedIndicators,
  OHLCDataInterval,
} from "../types";
import { KrakenService } from "./kraken";

export class AnalysisService {
  constructor(
    private readonly symbol: string,
    private readonly interval: OHLCDataInterval,
    private readonly model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics,
    private readonly krakenService: KrakenService
  ) {}

  async analyzeMarket(technicalData: CalculatedIndicators) {
    const uuid = randomUUID();
    const timestamp = new Date().toISOString();
    const currentPrice = technicalData.close[technicalData.close.length - 1];

    const indicatorAgents = [
      CandlestickIndicatorAgent,
      IchimokuIndicatorAgent,
      MomentumIndicatorAgent,
      TrendIndicatorAgent,
      VolatilityIndicatorAgent,
      VolumeIndicatorAgent,
    ];

    const [
      candlestickAnalysis,
      ichimokuAnalysis,
      momentumAnalysis,
      trendAnalysis,
      volatilityAnalysis,
      volumeAnalysis,
    ] = await Promise.all(
      indicatorAgents.map(async (Agent) => {
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

    const analysisRecord: AnalysisRecord = {
      uuid,
      timestamp,
      symbol: this.symbol,
      interval: this.interval,
      currentPrice,
      candlestickAnalysis,
      ichimokuAnalysis,
      momentumAnalysis,
      trendAnalysis,
      volatilityAnalysis,
      volumeAnalysis,
    };

    const finalAnalysisAgent = new FinalAnalysisAgent(
      this.symbol,
      this.interval,
      this.model,
      this.logger,
      this.metrics
    );

    const finalAnalysis = await finalAnalysisAgent.collate(analysisRecord);

    let finalAnalysisRecord = { ...analysisRecord, ...finalAnalysis };

    if (finalAnalysisRecord.recommendation === "BUY") {
      const orderBookData = await this.krakenService.fetchOrderBookData(
        this.symbol
      );
      this.logger.info("Order book data", { orderBookData });
      const entryPositionAgent = new EntryPositionAgent(
        this.symbol,
        this.interval,
        this.model,
        this.logger,
        this.metrics
      );

      const entryPositionAnalysis = await entryPositionAgent.analyze(
        technicalData,
        orderBookData
      );

      finalAnalysisRecord = {
        ...finalAnalysisRecord,
        entryPosition: { ...entryPositionAnalysis },
      };
    }

    this.logger.info("Final analysis", { finalAnalysisRecord });

    return finalAnalysisRecord;
  }
}
