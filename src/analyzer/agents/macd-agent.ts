import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { formatTimeSeries } from ".";
import { IndicatorAnalysis, IndicatorResult } from "../types";
import { Prompts } from "./prompts";

export class MACDAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { system, human } = Prompts.MACD;
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing MACD data", { data });
    const input = {
      symbol: data.symbol,
      timeframe: data.interval,
      current_macd: data.current.macdLine.toFixed(2),
      current_signal: data.current.signalLine.toFixed(2),
      current_histogram: data.current.histogram.toFixed(2),
      current_price: data.current.price.toFixed(2),
      macd_history: formatTimeSeries(data.history.macdLine, "macd_history"),
      signal_history: formatTimeSeries(
        data.history.signalLine,
        "signal_history"
      ),
      histogram_history: formatTimeSeries(
        data.history.histogram,
        "histogram_history"
      ),
      price_history: formatTimeSeries(data.history.price, "price_history"),
    };

    return await this.chain.invoke(input);
  }
}
