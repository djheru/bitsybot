import { Logger } from "@aws-lambda-powertools/logger";
import { randomUUID } from "crypto";
import { DateTime } from "luxon";
import { EvaluationResult, EvaluationSummaryResult } from "../types";

export class EvaluationSummarizer {
  constructor(private readonly logger: Logger) {}

  summarizeEvaluations(
    evaluations: EvaluationResult[]
  ): EvaluationSummaryResult {
    try {
      const range = {
        from: evaluations[0].timestamp,
        to: evaluations[evaluations.length - 1].timestamp,
      };
      const total = evaluations.length;
      const summary = this.analyzeEvaluations(evaluations);
      return {
        symbol: evaluations[0].symbol,
        interval: evaluations[0].interval,
        timestamp: DateTime.now().toISO(),
        uuid: randomUUID(),
        ...summary,
        formattedSummary: this.formatSummary(summary, total),
        range,
        total,
      };
    } catch (error) {
      this.logger.error("Failed to summarize evaluations", { error });
      throw error;
    }
  }

  private analyzeEvaluations(evaluations: EvaluationResult[]) {
    const results = {
      BUY: {
        success: 0,
        failure: 0,
        neutral: 0,
        successRate: 0,
        failureRate: 0,
        total: 0,
      },
      SELL: {
        success: 0,
        failure: 0,
        neutral: 0,
        successRate: 0,
        failureRate: 0,
        total: 0,
      },
      HOLD: {
        success: 0,
        failure: 0,
        neutral: 0,
        successRate: 0,
        failureRate: 0,
        total: 0,
      },
    };

    for (const record of evaluations) {
      const { recommendation, outcome } = record;
      if (recommendation === "BUY") {
        results.BUY[outcome as keyof typeof results.BUY]++;
        results.BUY.total++;
      } else if (recommendation === "SELL") {
        results.SELL[outcome as keyof typeof results.SELL]++;
        results.SELL.total++;
      } else {
        results.HOLD[outcome as keyof typeof results.HOLD]++;
        results.HOLD.total++;
      }
    }

    results.BUY.successRate =
      results.BUY.total > 0 ? results.BUY.success / results.BUY.total : -1;
    results.SELL.successRate =
      results.SELL.total > 0 ? results.SELL.success / results.SELL.total : -1;
    results.HOLD.successRate = results.HOLD.total
      ? results.HOLD.success / results.HOLD.total
      : -1;

    return results;
  }

  private formatSummary(
    summary: ReturnType<EvaluationSummarizer["analyzeEvaluations"]>,
    total: number
  ) {
    const { BUY: buy, SELL: sell, HOLD: hold } = summary;

    const formattedSummary = `
Evaluations Summary:
---------------------
Total Evaluations: ${total}

BUY Recommendations:
  - Success: ${buy.success}
  - Failure: ${buy.failure}
  - Neutral: ${buy.neutral}

SELL Recommendations:
  - Success: ${sell.success}
  - Failure: ${sell.failure}
  - Neutral: ${sell.neutral}
    `;
    return formattedSummary;
  }
}
