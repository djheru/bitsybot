import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { Prompts } from "./prompts";
import { IndicatorAnalysis, OHLCDataInterval } from "../types";

// Final Analysis Agent
export class FinalAnalysisAgent {
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    private readonly model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { system, human } = Prompts.Analysis;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(
    bbAnalysis: IndicatorAnalysis,
    rsiAnalysis: IndicatorAnalysis,
    macdAnalysis: IndicatorAnalysis,
    vwapAnalysis: IndicatorAnalysis,
    currentPrice: number,
    symbol: string,
    interval: OHLCDataInterval
  ): Promise<IndicatorAnalysis> {
    this.logger.info("Performing final analysis", {
      bbAnalysis,
      rsiAnalysis,
      macdAnalysis,
      vwapAnalysis,
      currentPrice,
    });

    const input = {
      symbol,
      timeframe: interval,
      bb_recommendation: bbAnalysis.recommendation,
      bb_confidence: bbAnalysis.confidence,
      bb_rationale: bbAnalysis.rationale,
      rsi_recommendation: rsiAnalysis.recommendation,
      rsi_confidence: rsiAnalysis.confidence,
      rsi_rationale: rsiAnalysis.rationale,
      macd_recommendation: macdAnalysis.recommendation,
      macd_confidence: macdAnalysis.confidence,
      macd_rationale: macdAnalysis.rationale,
      vwap_recommendation: vwapAnalysis.recommendation,
      vwap_confidence: vwapAnalysis.confidence,
      vwap_rationale: vwapAnalysis.rationale,
      current_price: currentPrice.toFixed(2),
    };

    return await this.chain.invoke(input);
  }
}
