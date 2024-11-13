import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { formatTimeSeries, toFixed } from ".";
import { IndicatorAnalysis, IndicatorResult } from "../types";
import { Prompts } from "./prompts";

// ATR Analysis Agent
export class ATRAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { human, system } = Prompts.ATR;
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing ATR data", { data });
    const input = {
      symbol: data.symbol,
      timeframe: data.interval,
      current_price: toFixed(data.current.price, 2),
      current_atr: toFixed(data.current.atr, 2),
      current_atr_percentage: toFixed(data.current.percentageATR, 2),
      volatility_state: data.current.volatilityState,
      atr_history: formatTimeSeries(data.history.atr, "atr_history"),
      price_history: formatTimeSeries(data.history.price, "price_history"),
      true_range_history: formatTimeSeries(
        data.history.trueRange,
        "true_range_history"
      ),
      percentage_atr_history: formatTimeSeries(
        data.history.percentageATR,
        "percentage_atr_history"
      ),
    };
    const response = await this.chain.invoke(input);
    return response;
  }
}
