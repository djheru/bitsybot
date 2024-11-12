import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { formatTimeSeries } from ".";
import { IndicatorAnalysis, IndicatorResult } from "../types";
import { Prompts } from "./prompts";

// Bollinger Bands Analysis Agent
export class BollingerBandsAgent {
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    private readonly model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { human, system } = Prompts.BollingerBands;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing Bollinger Bands data", { data });
    const input = {
      symbol: data.symbol,
      timeframe: data.interval,
      current_middle: data.current.middle.toFixed(2),
      current_upper: data.current.upper.toFixed(2),
      current_lower: data.current.lower.toFixed(2),
      current_price: data.current.price.toFixed(2),
      current_bandwidth: data.current.bandwidth.toFixed(4),
      current_percentB: data.current.percentB.toFixed(2),
      price_history: formatTimeSeries(data.history.price, "price_history"),
      upper_history: formatTimeSeries(data.history.upper, "upper_history"),
      middle_history: formatTimeSeries(data.history.middle, "middle_history"),
      lower_history: formatTimeSeries(data.history.lower, "lower_history"),
      bandwidth_history: formatTimeSeries(
        data.history.bandwidth,
        "bandwidth_history"
      ),
    };

    return await this.chain.invoke(input);
  }
}
