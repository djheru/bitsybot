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
  timeframeHours: number = 16,
  sellThresholdPercent: number = 2
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
    64,
    DateTime.now().minus({ hours: timeframeHours }).toISO()
  );

  if (!recentAnalyses.length || recentAnalyses.length === 0) {
    logger.error("No recent analyses found for evaluation");
    return results;
  }

  recentAnalyses.reverse().forEach((analysisForEvaluation) => {
    if (analysisForEvaluation.recommendation === "HOLD") {
      return;
    }
    let v = 0;
    const subsequentPrices = priceData.timestamp.map((_, index) => ({
      close: priceData.close[index],
      high: priceData.high[index],
      timestamp: priceData.timestamp[index],
    }));

    if (analysisForEvaluation.recommendation === "BUY") {
      const { hitExitIndex, hitStopLossIndex } = subsequentPrices.reduce(
        (acc, prices, idx) => {
          console.log(DateTime.fromMillis(prices.timestamp * 1000).toISO());
          if (
            `${DateTime.fromMillis(prices.timestamp * 1000).toISO()}` <=
            analysisForEvaluation.timestamp
          ) {
            return acc;
          }
          // Did the closing price hit the exit price during this time period
          const hitExitPrice =
            analysisForEvaluation.entryPosition &&
            prices.high >= analysisForEvaluation.entryPosition.exitPrice;

          // Did the closing price hit the stop loss during this time period
          const hitStopLoss =
            analysisForEvaluation.entryPosition &&
            prices.close <= analysisForEvaluation.entryPosition.stopLoss;

          if (hitExitPrice && acc.hitExitIndex === -1) {
            console.log("hit exit", {
              idx,
              prices,
              currentPrice: analysisForEvaluation.currentPrice,
              priceTime: DateTime.fromMillis(prices.timestamp * 1000).toISO(),
              analysisTime: analysisForEvaluation.timestamp,
            });
            acc.hitExitIndex = idx;
          } else if (hitStopLoss && acc.hitStopLossIndex === -1) {
            console.log("hit stop loss", {
              idx,
              prices,
              currentPrice: analysisForEvaluation.currentPrice,
              priceTime: DateTime.fromMillis(prices.timestamp * 1000).toISO(),
              analysisTime: analysisForEvaluation.timestamp,
            });
            acc.hitStopLossIndex = idx;
          }
          return acc;
        },
        { hitExitIndex: -1, hitStopLossIndex: -1 }
      );
      logger.info("exit and stop loss indexes", {
        hitExitIndex,
        hitStopLossIndex,
      });
      let detailsArray: string[] = [
        JSON.stringify({ hitExitIndex, hitStopLossIndex }),
      ];
      if (hitExitIndex === -1) {
        detailsArray.push(
          `Did not hit exit price of ${analysisForEvaluation?.entryPosition?.exitPrice}.`
        );
      } else {
        detailsArray.push(
          `Hit exit price of ${analysisForEvaluation?.entryPosition?.exitPrice}.`
        );
      }
      if (hitStopLossIndex === -1) {
        detailsArray.push(
          `Did not hit stop loss of ${analysisForEvaluation?.entryPosition?.stopLoss}.`
        );
      } else {
        detailsArray.push(
          `Hit stop loss of ${analysisForEvaluation?.entryPosition?.stopLoss}.`
        );
      }

      // hit exit before stop loss
      if (hitExitIndex < hitStopLossIndex && hitExitIndex >= 0) {
        outcome = "success";
        detailsArray.push(
          `Exit price of ${analysisForEvaluation?.entryPosition?.exitPrice} reached before stoploss of ${analysisForEvaluation?.entryPosition?.stopLoss} `
        );
      } else if (hitExitIndex > hitStopLossIndex && hitStopLossIndex >= 0) {
        outcome = "failure";
        detailsArray.push(
          `Stoploss price of ${analysisForEvaluation?.entryPosition?.stopLoss} reached before exit price of ${analysisForEvaluation?.entryPosition?.exitPrice} `
        );
      } else {
        outcome = "neutral";
        detailsArray.push(
          `Did not hit either the stoploss at ${analysisForEvaluation?.entryPosition?.stopLoss} or the exit price of ${analysisForEvaluation?.entryPosition?.exitPrice} `
        );
      }
      detailsArray.push(`within ${timeframeHours} hours.`);
      details = detailsArray.join("\n");
    } else if (analysisForEvaluation.recommendation === "SELL") {
      const sellPrice = analysisForEvaluation.currentPrice;
      const targetPrice = sellPrice * (1 - sellThresholdPercent / 100);
      const hitTarget = subsequentPrices.some(
        (prices) => prices.close <= targetPrice
      );

      if (hitTarget) {
        outcome = "success";
        details = `Price dropped to target of ${targetPrice} (${sellThresholdPercent}% decrease) `;
      } else {
        details = `Drop target price of ${targetPrice} not reached `;
      }
      details += `within ${timeframeHours} hours.`;
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
    if (evaluationResult.recommendation !== "HOLD") {
      results.push(evaluationResult);
    }
  });

  for (const result of results) {
    await repository.createEvaluationRecord(result);
  }
  return results;
}
