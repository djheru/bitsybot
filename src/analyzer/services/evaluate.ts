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
import { EvaluationSummarizer } from "./evaluation-summarizer";
import { SlackService } from "./slack";

export async function evaluatePerformance(
  symbol: string,
  interval: OHLCDataInterval,
  priceData: PriceData,
  repository: AnalysisRepository,
  slackService: SlackService,
  logger: Logger,
  timeframeHours: number = 24,
  sellThresholdPercent: number = 1.2
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];
  let outcome: EvaluationOutcome = "neutral";
  let details = "";
  let maxClose = 0;
  let minClose = Number.MAX_VALUE;

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
    timeframeHours * 4
    // DateTime.now().minus({ hours: timeframeHours }).toISO()
  );

  if (!recentAnalyses.length || recentAnalyses.length === 0) {
    logger.error("No recent analyses found for evaluation");
    return results;
  }

  const range = {
    from: recentAnalyses[0].timestamp,
    to: recentAnalyses[recentAnalyses.length - 1].timestamp,
  };

  logger.info(`Evaluating ${recentAnalyses.length} recent analyses`, { range });

  const subsequentPrices = priceData.timestamp.map((_, index) => ({
    close: priceData.close[index],
    high: priceData.high[index],
    timestamp: priceData.timestamp[index],
  }));

  // Sort recentAnalyses ASC like priceData
  recentAnalyses.reverse().forEach((analysisForEvaluation) => {
    let v = 0;

    if (analysisForEvaluation.recommendation === "BUY") {
      const {
        hitExitIndex,
        hitStopLossIndex,
        maxClose: maxClosePrice,
        minClose: minClosePrice,
      } = subsequentPrices.reduce(
        (acc, prices, idx) => {
          if (
            `${DateTime.fromMillis(prices.timestamp * 1000).toISO()}` <=
            analysisForEvaluation.timestamp
          ) {
            return acc;
          }

          // Did the high price hit the exit price during this time period
          const hitExitPrice =
            analysisForEvaluation.entryPosition &&
            prices.high >= analysisForEvaluation.entryPosition.exitPrice;

          // Did the closing price hit the stop loss during this time period
          const hitStopLoss =
            analysisForEvaluation.entryPosition &&
            prices.close <= analysisForEvaluation.entryPosition.stopLoss;

          if (hitExitPrice && acc.hitExitIndex === -1) {
            acc.hitExitIndex = idx;
          } else if (hitStopLoss && acc.hitStopLossIndex === -1) {
            acc.hitStopLossIndex = idx;
          }
          if (prices.close > acc.maxClose) {
            acc.maxClose = prices.close;
          }
          if (prices.close < acc.minClose) {
            acc.minClose = prices.close;
          }
          return acc;
        },
        {
          hitExitIndex: -1,
          hitStopLossIndex: -1,
          maxClose: 0,
          minClose: Number.MAX_VALUE,
        }
      );

      let detailsArray: string[] = [];

      detailsArray.push(
        hitExitIndex === -1
          ? `Did not hit exit price of ${analysisForEvaluation?.entryPosition?.exitPrice.toFixed(
              5
            )}.`
          : `Hit exit price of ${analysisForEvaluation?.entryPosition?.exitPrice.toFixed(
              5
            )}.`
      );

      detailsArray.push(
        hitStopLossIndex === -1
          ? `Did not hit stop loss of ${analysisForEvaluation?.entryPosition?.stopLoss.toFixed(
              5
            )}.`
          : `Hit stop loss of ${analysisForEvaluation?.entryPosition?.stopLoss.toFixed(
              5
            )}.`
      );

      detailsArray.push(
        `Max close price: $${maxClose.toFixed(5)} (${(
          (maxClose / analysisForEvaluation.currentPrice) *
          100
        ).toFixed(2)}%)`,
        `Min close price: $${minClose.toFixed(5)} (${(
          (minClose / analysisForEvaluation.currentPrice) *
          100
        ).toFixed(2)}%)`
      );

      if (
        // hit exit before stop loss
        hitExitIndex >= 0 &&
        (hitExitIndex < hitStopLossIndex || hitStopLossIndex === -1)
      ) {
        outcome = "success";
        detailsArray.push(
          `Exit price of ${analysisForEvaluation?.entryPosition?.exitPrice.toFixed(
            5
          )} reached before stoploss of ${analysisForEvaluation?.entryPosition?.stopLoss.toFixed(
            5
          )} `
        );
      } else if (
        // hit stop loss before exit
        hitStopLossIndex >= 0 &&
        (hitStopLossIndex < hitExitIndex || hitExitIndex === -1)
      ) {
        outcome = "failure";
        detailsArray.push(
          `Stoploss price of ${analysisForEvaluation?.entryPosition?.stopLoss.toFixed(
            5
          )} reached before exit price of ${analysisForEvaluation?.entryPosition?.exitPrice.toFixed(
            5
          )} `
        );
      } else if (hitExitIndex === -1 && hitStopLossIndex === -1) {
        // neither hit
        outcome = "neutral";
        detailsArray.push(
          `Did not hit either the stoploss at ${analysisForEvaluation?.entryPosition?.stopLoss.toFixed(
            5
          )} or the exit price of ${analysisForEvaluation?.entryPosition?.exitPrice.toFixed(
            5
          )} `
        );
      }
      details = detailsArray.join("\n");
      maxClose = maxClosePrice;
      minClose = minClosePrice;
    } else if (analysisForEvaluation.recommendation === "SELL") {
      const sellPrice = analysisForEvaluation.currentPrice;
      const targetPrice = sellPrice * (1 - sellThresholdPercent / 100);
      const triggerPrice = sellPrice * (1 + sellThresholdPercent / 100);
      const hitTarget = subsequentPrices.some(
        (prices) => prices.close <= targetPrice
      );
      const hitHigher = subsequentPrices.some(
        (prices) => prices.close >= triggerPrice
      );
      maxClose = Math.max(...subsequentPrices.map((prices) => prices.close));
      minClose = Math.min(...subsequentPrices.map((prices) => prices.close));

      if (hitTarget) {
        outcome = "success";
        details = `Price dropped to target of ${targetPrice.toFixed(
          5
        )} (${sellThresholdPercent}% decrease) `;
      } else if (hitHigher) {
        outcome = "failure";
        details = `Price increased to trigger of ${triggerPrice.toFixed(
          5
        )} (${sellThresholdPercent}% increase) `;
      } else {
        details = `Drop target price of ${targetPrice.toFixed(5)} not reached `;
      }
      details += `within ${timeframeHours} hours.`;
    } else if (analysisForEvaluation.recommendation === "HOLD") {
      const sellPrice = analysisForEvaluation.currentPrice;
      const lowTriggerPrice = sellPrice * (1 - sellThresholdPercent / 100);
      const highTriggerPrice = sellPrice * (1 + sellThresholdPercent / 100);

      const wentHigher = subsequentPrices.some(
        (prices) => prices.close >= highTriggerPrice
      );

      const wentLower = subsequentPrices.some(
        (prices) => prices.close <= lowTriggerPrice
      );

      maxClose = Math.max(...subsequentPrices.map((prices) => prices.close));
      minClose = Math.min(...subsequentPrices.map((prices) => prices.close));

      if (wentHigher) {
        outcome = "neutral";
        details = `Price went higher than ${highTriggerPrice} (${sellThresholdPercent}% increase) `;
      } else if (wentLower) {
        outcome = "failure";
        details = `Price went lower than ${lowTriggerPrice} (${sellThresholdPercent}% decrease) `;
      } else {
        outcome = "success";
        details = `Price stayed within ${sellThresholdPercent}% range `;
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
      maxClose,
      minClose,
    };

    results.push(evaluationResult);
  });

  for (const result of results) {
    logger.info("Evaluation Result", { result });
    await repository.createEvaluationRecord(result);
  }

  const summarizer = new EvaluationSummarizer(logger);
  const summary = await summarizer.summarizeEvaluations(results);
  logger.info("Evaluation Summary", { summary });
  await repository.createEvaluationSummary(summary);
  await slackService.sendSummaryEvaluationsMessage(summary.formattedSummary);
  return results;
}
