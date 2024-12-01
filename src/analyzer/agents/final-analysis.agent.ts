import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { AnalysisRecord, IndicatorAnalysis, OHLCDataInterval } from "../types";
import { Prompts } from "./prompts";

export class FinalAnalysisAgent {
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;
  private inputArrayLength = 14; // Adjustable for slice length

  constructor(
    private readonly symbol: string,
    private readonly interval: OHLCDataInterval,
    private readonly model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { system, human } = Prompts.FinalAnalysis;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);
    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze({
    candlestickAnalysis,
    momentumAnalysis,
    trendAnalysis,
    volatilityAnalysis,
    volumeAnalysis,
  }: AnalysisRecord): Promise<IndicatorAnalysis> {
    this.logger.info("Final analysis agent invoked");
    const input = {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      CANDLESTICK_RECOMMENDATION: candlestickAnalysis.recommendation,
      CANDLESTICK_CONFIDENCE: candlestickAnalysis.confidence,
      CANDLESTICK_RATIONALE: candlestickAnalysis.rationale,
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
    this.logger.info("Final analysis agent input", input);

    this.metrics.addDimension("symbol", this.symbol);
    this.metrics.addDimension("interval", `${this.interval} minutes`);
    this.metrics.addDimension("analysisType", "final");
    this.metrics.addMetric("finalAnalysisInvoked", "Count", 1);
    try {
      const response = await this.chain.invoke(input);
      this.logger.info("Final analysis agent response", response);
      this.metrics.addMetric("FinalAnalysisCompleted", "Count", 1);
      return response;
    } catch (error) {
      this.logger.error("Final analysis agent error", { error });
      this.metrics.addMetric("Final analysis failed", "Count", 1);
      throw error;
    }
  }
}
