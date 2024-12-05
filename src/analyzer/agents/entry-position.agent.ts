import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";

import {
  AnalysisEntryPosition,
  CalculatedIndicators,
  OHLCDataInterval,
} from "../types";
import { Prompts } from "./prompts";

export class EntryPositionAgent {
  private parser: JsonOutputParser<AnalysisEntryPosition>;
  private chain: RunnableSequence;
  private inputArrayLength = 14;
  constructor(
    private readonly symbol: string,
    private readonly interval: OHLCDataInterval,
    private readonly model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { system, human } = Prompts.EntryPosition;
    this.parser = new JsonOutputParser<AnalysisEntryPosition>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["user", `${system} ${human}`],
    ]);
    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze({
    close,
    atr,
    bollingerBands,
  }: CalculatedIndicators): Promise<AnalysisEntryPosition> {
    this.logger.info("Analyzing entry position");
    const input = {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      CURRENT: close[close.length - 1],
      CLOSE: close.slice(-1 * this.inputArrayLength).join(","),
      ATR: atr.slice(-1 * this.inputArrayLength).join(","),
      BB_LOWER: bollingerBands
        .slice(-1 * this.inputArrayLength)
        .map((b) => b.lower)
        .join(","),
    };
    this.logger.info("Analysis agent input", input);

    this.metrics.addDimension("symbol", this.symbol);
    this.metrics.addDimension("interval", `${this.interval} minutes`);
    this.metrics.addDimension("analysisType", "entry");
    this.metrics.addMetric("entryAnalysisInvoked", "Count", 1);
    try {
      const response = await this.chain.invoke(input);
      this.logger.info("Analysis agent response", response);
      this.metrics.addMetric("entryAnalysisCompleted", "Count", 1);
      return response;
    } catch (error) {
      this.logger.error("Analysis agent error", { error });
      this.metrics.addMetric("entryAnalysisFailed", "Count", 1);
      throw error;
    }
  }
}
