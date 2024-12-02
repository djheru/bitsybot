import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import {
  AnalysisRecord,
  CalculatedIndicators,
  IndicatorAnalysis,
  OHLCDataInterval,
  TimeSeriesPoint,
} from "../types";
import { PromptTemplate } from "./prompts";

export { FinalAnalysisAgent } from "./analysis-agent";
export { ATRAgent } from "./atr-agent";
export { MACDAgent } from "./macd-agent";
export { RSIAgent } from "./rsi-agent";

export class BaseAgent {
  public prompts: PromptTemplate = { system: "", human: "" };
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;
  protected inputArrayLength = 14; // Adjustable for slice length
  protected analysisType: string;

  constructor(
    protected readonly symbol: string,
    protected readonly interval: OHLCDataInterval,
    protected readonly model: ChatOpenAI,
    protected readonly logger: Logger,
    protected readonly metrics: Metrics
  ) {
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
  }

  getChain(): RunnableSequence {
    const { system, human, type: analysisType = "base" } = this.prompts;
    this.analysisType = analysisType;
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);
    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
    return this.chain;
  }

  async collate(data: AnalysisRecord): Promise<IndicatorAnalysis> {
    this.logger.info("Collating analysis");
    const input = this.getAnalysisCollationInput(data);
    this.logger.info("Agent input", input);

    this.metrics.addDimension("symbol", this.symbol);
    this.metrics.addDimension("interval", `${this.interval} minutes`);
    this.metrics.addDimension("analysisType", this.analysisType);
    this.metrics.addMetric(`${this.analysisType} agent invoked`, "Count", 1);

    try {
      const response = await this.getChain().invoke(input);
      this.logger.info(`${this.analysisType} agent response`, response);
      this.metrics.addMetric(
        `${this.analysisType} analysis collation completed`,
        "Count",
        1
      );
      return response;
    } catch (error) {
      this.logger.error(`${this.analysisType} agent error`, { error });
      this.metrics.addMetric(
        `${this.analysisType} analysis collation failed`,
        "Count",
        1
      );
      throw error;
    }
  }

  async analyze(data: CalculatedIndicators): Promise<IndicatorAnalysis> {
    this.logger.info("Conducting analysis");
    const input = this.getAnalysisInput(data);
    this.logger.info("Agent input", input);

    this.metrics.addDimension("symbol", this.symbol);
    this.metrics.addDimension("interval", `${this.interval} minutes`);
    this.metrics.addDimension("analysisType", this.analysisType);
    this.metrics.addMetric(`${this.analysisType} agent invoked`, "Count", 1);

    try {
      const response = await this.getChain().invoke(input);
      this.logger.info(`${this.analysisType} agent response`, response);
      this.metrics.addMetric(
        `${this.analysisType} analysis completed`,
        "Count",
        1
      );
      return response;
    } catch (error) {
      this.logger.error(`${this.analysisType} agent error`, { error });
      this.metrics.addMetric(
        `${this.analysisType} analysis failed`,
        "Count",
        1
      );
      throw error;
    }
  }

  protected getAnalysisInput(data: CalculatedIndicators): Record<string, any> {
    throw new Error("Method not implemented.");
  }

  protected getAnalysisCollationInput(
    data: AnalysisRecord
  ): Record<string, any> {
    throw new Error("Method not implemented.");
  }
}

// Base formatter for time series data
export function formatTimeSeries(
  series: TimeSeriesPoint[],
  label: string,
  limit = 10
): string {
  return series
    .slice(-1 * limit) // Get last 10 points for readability
    .map((point) => {
      if (!point.value) {
        throw new Error(`Invalid time series point for ${label}`);
      }
      return `${new Date(point.timestamp).toISOString()}: ${point.value.toFixed(
        2
      )}`;
    })
    .join("\n");
}

export function toFixed(
  value: string | number | boolean,
  precision = 2
): string | number | boolean {
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  return value.toFixed(precision);
}
