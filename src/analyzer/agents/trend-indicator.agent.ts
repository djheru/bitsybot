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

export class TrendIndicatorAgent {
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;
  constructor(
    private readonly symbol: string,
    private readonly interval: OHLCDataInterval,
    private readonly model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { system, human } = Prompts.Trend;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);
    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze({
    ema,
    macd,
    adx,
  }: CalculatedIndicators): Promise<IndicatorAnalysis> {
    const input = {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      EMA: ema.slice(0, 10).join(","),
      MACD: macd
        .slice(0, 10)
        .map((m) => m.MACD || "-")
        .join(","),
      SIGNAL: macd
        .slice(0, 10)
        .map((m) => m.signal || "-")
        .join(","),
      HIST: macd
        .slice(0, 10)
        .map((m) => m.histogram || "-")
        .join(","),
      ADX: adx
        .slice(0, 10)
        .map((a) => a.adx)
        .join(","),
      PDI: adx
        .slice(0, 10)
        .map((a) => a.pdi)
        .join(","),
      MDI: adx
        .slice(0, 10)
        .map((a) => a.mdi)
        .join(","),
    };

    this.logger.info("Analyzing trend indicators", { input });

    const response = await this.chain.invoke(input);
    return response;
  }
}
