import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { IndicatorAnalysis, OHLCDataInterval } from "../types";
import { Prompts } from "./prompts";

export interface AnalyzeProps {
  bbAnalysis: IndicatorAnalysis;
  rsiAnalysis: IndicatorAnalysis;
  macdAnalysis: IndicatorAnalysis;
  stochAnalysis: IndicatorAnalysis;
  vwapAnalysis: IndicatorAnalysis;
  atrAnalysis: IndicatorAnalysis;
  currentPrice: number;
  symbol: string;
  interval: OHLCDataInterval;
}

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

  async analyze({
    bbAnalysis,
    rsiAnalysis,
    macdAnalysis,
    stochAnalysis,
    vwapAnalysis,
    atrAnalysis,
    currentPrice,
    symbol,
    interval,
  }: AnalyzeProps): Promise<IndicatorAnalysis> {
    this.logger.info("Performing final analysis", {
      bbAnalysis,
      rsiAnalysis,
      macdAnalysis,
      stochAnalysis,
      vwapAnalysis,
      atrAnalysis,
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
      stoch_recommendation: stochAnalysis.recommendation,
      stoch_confidence: stochAnalysis.confidence,
      stoch_rationale: stochAnalysis.rationale,
      vwap_recommendation: vwapAnalysis.recommendation,
      vwap_confidence: vwapAnalysis.confidence,
      vwap_rationale: vwapAnalysis.rationale,
      atr_recommendation: atrAnalysis.recommendation,
      atr_confidence: atrAnalysis.confidence,
      atr_rationale: atrAnalysis.rationale,
      current_price: currentPrice.toFixed(2),
    };

    return await this.chain.invoke(input);
  }
}