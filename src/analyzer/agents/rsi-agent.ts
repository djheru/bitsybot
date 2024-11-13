import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { formatTimeSeries, toFixed } from ".";
import { IndicatorAnalysis, IndicatorResult } from "../types";
import { Prompts } from "./prompts";

// RSI Analysis Agent
export class RSIAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { human, system } = Prompts.RSI;
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
      symbol: data.symbol,
      timeframe: data.interval,
      current_rsi: toFixed(data.current.rsi, 2),
      current_price: toFixed(data.current.price, 2),
      current_avg_gain: toFixed(data.current.avgGain, 2),
      current_avg_loss: toFixed(data.current.avgLoss, 2),
      rsi_history: formatTimeSeries(data.history.rsi, "rsi_history"),
      price_history: formatTimeSeries(data.history.price, "price_history"),
      avg_gain_history: formatTimeSeries(
        data.history.avgGain,
        "avg_gain_history"
      ),
      avg_loss_history: formatTimeSeries(
        data.history.avgLoss,
        "avg_loss_history"
      ),
    };
    const response = await this.chain.invoke(input);
    return response;
  }
}
