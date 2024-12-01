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

export class MomentumIndicatorAgent {
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
    const { system, human } = Prompts.Momentum;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);
    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze({
    rsi,
    stochastic,
    williamsR,
  }: CalculatedIndicators): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing momentum indicators");
    const input = {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      RSI: rsi.slice(0, this.inputArrayLength).join(","),
      STOCHASTIC_K: stochastic
        .slice(0, this.inputArrayLength)
        .map((s) => s.k)
        .join(","),
      STOCHASTIC_D: stochastic
        .slice(0, this.inputArrayLength)
        .map((s) => s.d)
        .join(","),
      WILLIAMS_R: williamsR.slice(0, this.inputArrayLength).join(","),
    };
    this.logger.info("Analysis agent input", input);

    this.metrics.addDimension("symbol", this.symbol);
    this.metrics.addDimension("interval", `${this.interval} minutes`);
    this.metrics.addDimension("analysisType", "momentum");
    this.metrics.addMetric("momentumAnalysisInvoked", "Count", 1);
    try {
      const response = await this.chain.invoke(input);
      this.logger.info("Analysis agent response", response);
      this.metrics.addMetric("momentumAnalysisCompleted", "Count", 1);
      return response;
    } catch (error) {
      this.logger.error("Analysis agent error", { error });
      this.metrics.addMetric("momentumAnalysisFailed", "Count", 1);
      throw error;
    }
  }
}
