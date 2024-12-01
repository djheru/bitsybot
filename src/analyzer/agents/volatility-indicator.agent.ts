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

export class VolatilityIndicatorAgent {
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
    const { system, human } = Prompts.Volatility;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);
    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze({
    bollingerBands,
    atr,
    roc,
    cci,
    psar,
  }: CalculatedIndicators): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing volatility indicators");
    const input = {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      BOLLINGER_LOWER: bollingerBands
        .slice(0, this.inputArrayLength)
        .map((b) => b.lower)
        .join(","),
      BOLLINGER_MIDDLE: bollingerBands
        .slice(0, this.inputArrayLength)
        .map((b) => b.middle)
        .join(","),
      BOLLINGER_UPPER: bollingerBands
        .slice(0, this.inputArrayLength)
        .map((b) => b.upper)
        .join(","),
      ATR: atr.slice(0, this.inputArrayLength).join(","),
      ROC: roc.slice(0, this.inputArrayLength).join(","),
      CCI: cci.slice(0, this.inputArrayLength).join(","),
      PSAR: psar.slice(0, this.inputArrayLength).join(","),
    };
    this.logger.info("Analysis agent input", input);

    this.metrics.addDimension("symbol", this.symbol);
    this.metrics.addDimension("interval", `${this.interval} minutes`);
    this.metrics.addDimension("analysisType", "volatility");
    this.metrics.addMetric("volatilityAnalysisInvoked", "Count", 1);
    try {
      const response = await this.chain.invoke(input);
      this.logger.info("Analysis agent response", response);
      this.metrics.addMetric("volatilityAnalysisCompleted", "Count", 1);
      return response;
    } catch (error) {
      this.logger.error("Analysis agent error", { error });
      this.metrics.addMetric("volatilityAnalysisFailed", "Count", 1);
      throw error;
    }
  }
}
