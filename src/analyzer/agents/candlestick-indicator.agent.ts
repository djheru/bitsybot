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

export class CandlestickIndicatorAgent {
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
    const { system, human } = Prompts.Candlestick;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);
    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze({
    bullishEngulfing,
    morningStar,
    hammer,
    threeWhiteSoldiers,
    bearishEngulfing,
    eveningStar,
    shootingStar,
    threeBlackCrows,
    doji,
    dragonflyDoji,
    gravestoneDoji,
  }: CalculatedIndicators): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing candlestick indicators");
    const input = {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      BULLISH_ENGULFING: bullishEngulfing,
      MORNING_STAR: morningStar,
      HAMMER: hammer,
      THREE_WHITE_SOLDIERS: threeWhiteSoldiers,
      BEARISH_ENGULFING: bearishEngulfing,
      EVENING_STAR: eveningStar,
      SHOOTING_STAR: shootingStar,
      THREE_BLACK_CROWS: threeBlackCrows,
      DOJI: doji,
      DRAGONFLY_DOJI: dragonflyDoji,
      GRAVESTONE_DOJI: gravestoneDoji,
    };
    this.logger.info("Analysis agent input", input);

    this.metrics.addDimension("symbol", this.symbol);
    this.metrics.addDimension("interval", `${this.interval} minutes`);
    this.metrics.addDimension("analysisType", "candlestick");
    this.metrics.addMetric("candlestickAnalysisInvoked", "Count", 1);
    try {
      const response = await this.chain.invoke(input);
      this.logger.info("Analysis agent response", response);
      this.metrics.addMetric("candlestickAnalysisCompleted", "Count", 1);
      return response;
    } catch (error) {
      this.logger.error("Analysis agent error", { error });
      this.metrics.addMetric("candlestickAnalysisFailed", "Count", 1);
      throw error;
    }
  }
}
