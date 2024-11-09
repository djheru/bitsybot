import { ChatOpenAI } from "@langchain/openai";
import {
  BollingerBandsAgent,
  FinalAnalysisAgent,
  RSIAgent,
  VWAPAgent,
} from "../services/agents";
import { IndicatorAnalysis, IndicatorResult } from "../types";

export async function analyzeMarket(
  technicalData: IndicatorResult[],
  model: ChatOpenAI
): Promise<{
  bbAnalysis: IndicatorAnalysis;
  rsiAnalysis: IndicatorAnalysis;
  finalAnalysis: IndicatorAnalysis;
}> {
  const bbAgent = new BollingerBandsAgent(model);
  const rsiAgent = new RSIAgent(model);
  const vwapAgent = new VWAPAgent(model);
  const finalAgent = new FinalAnalysisAgent(model);

  // Get individual analyses
  const bbAnalysis = await bbAgent.analyze(technicalData[0]); // Bollinger Bands
  const rsiAnalysis = await rsiAgent.analyze(technicalData[1]); // RSI
  const vwapAnalysis = await vwapAgent.analyze(technicalData[2]); // VWAP

  // Get final analysis
  const finalAnalysis = await finalAgent.analyze(
    bbAnalysis,
    rsiAnalysis,
    vwapAnalysis,
    technicalData[0].current.price
  );

  return {
    bbAnalysis,
    rsiAnalysis,
    finalAnalysis,
  };
}
