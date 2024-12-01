import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import {
  CalculatedIndicators,
  IndicatorAnalysis,
  OHLCDataInterval,
} from "../types";
import { Prompts } from "./prompts";

export class TrendIndicatorAgent {
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;
  private inputArrayLength = 14;
  constructor(
    private readonly symbol: string,
    private readonly interval: OHLCDataInterval,
    private readonly model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { system, human } = Prompts.Trend;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);
    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze({
    ema,
    macd,
    adx,
  }: CalculatedIndicators): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing trend indicators");
    const input = {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      EMA: ema.slice(0, this.inputArrayLength).join(","),
      MACD: macd
        .slice(0, this.inputArrayLength)
        .map((m) => m.MACD || "-")
        .join(","),
      SIGNAL: macd
        .slice(0, this.inputArrayLength)
        .map((m) => m.signal || "-")
        .join(","),
      HIST: macd
        .slice(0, this.inputArrayLength)
        .map((m) => m.histogram || "-")
        .join(","),
      ADX: adx
        .slice(0, this.inputArrayLength)
        .map((a) => a.adx)
        .join(","),
      PDI: adx
        .slice(0, this.inputArrayLength)
        .map((a) => a.pdi)
        .join(","),
      MDI: adx
        .slice(0, this.inputArrayLength)
        .map((a) => a.mdi)
        .join(","),
    };
    this.logger.info("Analysis agent input", input);

    this.metrics.addDimension("symbol", this.symbol);
    this.metrics.addDimension("interval", `${this.interval} minutes`);
    this.metrics.addDimension("analysisType", "trend");
    this.metrics.addMetric("trendAnalysisInvoked", "Count", 1);
    try {
      const response = await this.chain.invoke(input);
      this.logger.info("Analysis agent response", response);
      this.metrics.addMetric("trendAnalysisCompleted", "Count", 1);
      return response;
    } catch (error) {
      this.logger.error("Analysis agent error", { error });
      this.metrics.addMetric("trendAnalysisFailed", "Count", 1);
      throw error;
    }
  }
}
