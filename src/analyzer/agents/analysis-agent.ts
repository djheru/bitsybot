import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { IndicatorAnalysis, OHLCDataInterval } from "../types";
import { Prompts } from "./prompts";

export interface AnalyzeProps {
  atrAnalysis: IndicatorAnalysis;
  currentPrice: number;
  interval: OHLCDataInterval;
  macdAnalysis: IndicatorAnalysis;
  rsiAnalysis: IndicatorAnalysis;
  symbol: string;
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
    atrAnalysis,
    currentPrice,
    interval,
    macdAnalysis,
    rsiAnalysis,
    symbol,
  }: AnalyzeProps): Promise<IndicatorAnalysis> {
    this.logger.info("Performing final analysis", {
      atrAnalysis,
      currentPrice,
      macdAnalysis,
      rsiAnalysis,
    });

    const input = {
      symbol,
      timeframe: interval,
      atr_confidence: atrAnalysis.confidence,
      atr_rationale: atrAnalysis.rationale,
      atr_recommendation: atrAnalysis.recommendation,
      macd_confidence: macdAnalysis.confidence,
      macd_rationale: macdAnalysis.rationale,
      macd_recommendation: macdAnalysis.recommendation,
      rsi_confidence: rsiAnalysis.confidence,
      rsi_rationale: rsiAnalysis.rationale,
      rsi_recommendation: rsiAnalysis.recommendation,
      current_price: currentPrice.toFixed(2),
    };

    return await this.chain.invoke(input);
  }
}
