import { AnalysisRecord, PriceData } from "../types";

type EvaluationOutcome = "success" | "failure" | "neutral";

interface EvaluationResult {
  record: AnalysisRecord;
  outcome: EvaluationOutcome;
  details: string; // Explanation of the result
}

const getPriceHistory = (startTime: string, endTime: string) => {};

async function evaluatePerformance(
  records: AnalysisRecord[],
  getPriceHistory: (
    symbol: string,
    startTime: string,
    endTime: string
  ) => Promise<PriceData>,
  timeframeHours: number = 4,
  sellThresholdPercent: number = 1
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];

  for (const record of records) {
    const startTime = new Date(record.timestamp).toISOString();
    const endTime = new Date(
      new Date(record.timestamp).getTime() + timeframeHours * 60 * 60 * 1000
    ).toISOString();

    const priceData = await getPriceHistory(record.symbol, startTime, endTime);

    let outcome: EvaluationOutcome = "neutral";
    let details = "";

    if (record.recommendation === "BUY") {
      const hitExit = priceData.close.some(
        (close) =>
          record.entryPosition && close >= record.entryPosition.exitPrice
      );
      const hitStopLoss = priceData.close.some(
        (close) =>
          record.entryPosition && close <= record.entryPosition.stopLoss
      );

      if (hitExit) {
        outcome = "success";
        details = `Exit price of ${record?.entryPosition?.exitPrice} reached.`;
      } else if (hitStopLoss) {
        outcome = "failure";
        details = `Stop loss of ${record?.entryPosition?.stopLoss} reached.`;
      } else {
        details = `Neither exit price nor stop loss reached within ${timeframeHours} hours.`;
      }
    } else if (record.recommendation === "SELL") {
      const sellPrice = record.currentPrice;
      const targetPrice = sellPrice * (1 - sellThresholdPercent / 100);
      const hitTarget = priceData.close.some((close) => close <= targetPrice);

      if (hitTarget) {
        outcome = "success";
        details = `Price dropped to ${targetPrice} (${sellThresholdPercent}% decrease).`;
      } else {
        details = `Target price of ${targetPrice} not reached within ${timeframeHours} hours.`;
      }
    }

    results.push({
      record,
      outcome,
      details,
    });
  }

  return results;
}
