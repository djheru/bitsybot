import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { formatTimeSeries, toFixed } from ".";
import { IndicatorAnalysis, IndicatorResult } from "../types";
import { Prompts } from "./prompts";

// StochasticOscillator Analysis Agent
export class StochasticOscillatorAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { human, system } = Prompts.StochasticOscillator;
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing RSI data", { data });
    const input = {
      timeframe: data.interval,
      symbol: data.symbol,
      current_price: toFixed(data.current.price, 2),
      current_k: toFixed(data.current.k, 2),
      current_d: toFixed(data.current.d, 2),
      k_history: formatTimeSeries(data.history.k, "k_history"),
      d_history: formatTimeSeries(data.history.d, "d_history"),
      price_history: formatTimeSeries(data.history.price, "price_history"),
    };
    const response = await this.chain.invoke(input);
    return response;
  }
}
