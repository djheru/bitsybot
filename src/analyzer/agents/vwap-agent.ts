import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { formatTimeSeries } from ".";
import { IndicatorAnalysis, IndicatorResult } from "../types";
import { Prompts } from "./prompts";

export class VWAPAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { system, human } = Prompts.VWAP;
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing VWAP data", { data });
    const input = {
      symbol: data.symbol,
      timeframe: data.interval,
      current_vwap: data.current.vwap.toFixed(2),
      current_price: data.current.price.toFixed(2),
      current_volume: data.current.volume.toFixed(2),
      price_to_vwap: data.current.priceToVWAP.toFixed(2),
      relative_volume: data.current.relativeVolume.toFixed(2),
      vwap_history: formatTimeSeries(data.history.vwap, "vwap_history"),
      price_history: formatTimeSeries(data.history.price, "price_history"),
      volume_history: formatTimeSeries(
        data.history.relativeVolume,
        "volume_history"
      ),
      relative_volume_history: formatTimeSeries(
        data.history.relativeVolume,
        "relative_volume_history"
      ),
    };

    return await this.chain.invoke(input);
  }
}
