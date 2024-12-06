import { Logger } from "@aws-lambda-powertools/logger";
import { DateTime } from "luxon";
import {
  AnalysisRecord,
  EvaluationOutcome,
  EvaluationResult,
  OHLCDataInterval,
  PriceData,
} from "../types";
import { AnalysisRepository } from "./db";

export async function evaluatePerformance(
  symbol: string,
  interval: OHLCDataInterval,
  priceData: PriceData,
  repository: AnalysisRepository,
  logger: Logger,
  timeframeHours: number = 4,
  sellThresholdPercent: number = 1
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];
  let outcome: EvaluationOutcome = "neutral";
  let details = "";

  // Check the previous analysis to see if the recommendation or confidence has changed
  logger.info("evaluatePerformance", {
    symbol,
    interval,
    timeframeHours,
    sellThresholdPercent,
  });
  const recentAnalyses = await repository.getRecentAnalyses(
    symbol,
    interval,
    16,
    DateTime.now().minus({ hours: timeframeHours }).toISO()
  );

  if (!recentAnalyses.length || recentAnalyses.length === 0) {
    logger.error("No recent analyses found for evaluation");
    return results;
  }

  recentAnalyses.forEach((analysisForEvaluation) => {
    const subsequentClosePrices = priceData.timestamp
      .filter((timestamp) => {
        return (
          `${DateTime.fromMillis(timestamp * 1000).toISO()}` >
          analysisForEvaluation.timestamp
        );
      })
      .map((_, index) => priceData.close[index]);

    if (analysisForEvaluation.recommendation === "BUY") {
      const hitExit = subsequentClosePrices.some(
        (close) =>
          analysisForEvaluation.entryPosition &&
          close >= analysisForEvaluation.entryPosition.exitPrice
      );
      const hitStopLoss = subsequentClosePrices.some(
        (close) =>
          analysisForEvaluation.entryPosition &&
          close <= analysisForEvaluation.entryPosition.stopLoss
      );

      if (hitExit) {
        outcome = "success";
        details = `Exit price of ${analysisForEvaluation?.entryPosition?.exitPrice} reached.`;
      } else if (hitStopLoss) {
        outcome = "failure";
        details = `Stop loss of ${analysisForEvaluation?.entryPosition?.stopLoss} reached.`;
      } else {
        details = `Neither exit price nor stop loss reached within ${timeframeHours} hours.`;
      }
    } else if (analysisForEvaluation.recommendation === "SELL") {
      const sellPrice = analysisForEvaluation.currentPrice;
      const targetPrice = sellPrice * (1 - sellThresholdPercent / 100);
      const hitTarget = subsequentClosePrices.some(
        (close) => close <= targetPrice
      );

      if (hitTarget) {
        outcome = "success";
        details = `Price dropped to ${targetPrice} (${sellThresholdPercent}% decrease).`;
      } else {
        details = `Target price of ${targetPrice} not reached within ${timeframeHours} hours.`;
      }
    }

    const formatResponse = ({
      confidence,
      currentPrice,
      interval,
      recommendation,
      symbol,
      timestamp,
      uuid,
    }: AnalysisRecord) => ({
      confidence,
      currentPrice,
      interval,
      recommendation,
      symbol,
      timestamp,
      uuid,
    });

    const evaluationResult = {
      ...formatResponse(analysisForEvaluation),
      outcome,
      details,
    };

    logger.info("Evaluation result", evaluationResult);

    results.push(evaluationResult);
  });

  for (const result of results) {
    await repository.createEvaluationRecord(result);
  }
  return results;
}
