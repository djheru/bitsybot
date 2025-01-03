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
        formattedSummary: this.formatSummary(summary, total, range),
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
        if (outcome !== "neutral") {
          results.BUY.total++;
        }
      } else if (recommendation === "SELL") {
        results.SELL[outcome as keyof typeof results.SELL]++;
        if (outcome !== "neutral") {
          results.SELL.total++;
        }
      } else {
        results.HOLD[outcome as keyof typeof results.HOLD]++;
        if (outcome !== "neutral") {
          results.HOLD.total++;
        }
      }
    }

    results.BUY.successRate =
      results.BUY.total > 0
        ? (results.BUY.success / results.BUY.total) * 100
        : -1;
    results.SELL.successRate =
      results.SELL.total > 0
        ? (results.SELL.success / results.SELL.total) * 100
        : -1;
    results.HOLD.successRate = results.HOLD.total
      ? (results.HOLD.success / results.HOLD.total) * 100
      : -1;

    return results;
  }

  private formatSummary(
    summary: ReturnType<EvaluationSummarizer["analyzeEvaluations"]>,
    total: number,
    range: { from: string; to: string }
  ) {
    const { BUY: buy, SELL: sell, HOLD: hold } = summary;

    const formattedSummary = `
🕋 *Evaluations Summary* 🕋
-----------------------------------
*Total Evaluations:* ${total}
*From:* ${DateTime.fromISO(range.from, { zone: "America/Phoenix" }).toFormat(
      "MM/dd/yyyy HH:mm:ss a"
    )}
*To:* ${DateTime.fromISO(range.to, { zone: "America/Phoenix" }).toFormat(
      "MM/dd/yyyy HH:mm:ss a"
    )}

*BUY Recommendations:*
> - Success: ${buy.success}
> - Failure: ${buy.failure}
> - Neutral: ${buy.neutral}
> - Success Rate: ${
      buy.successRate === -1 ? "N/A" : buy.successRate.toFixed(2) + "%"
    }

*SELL Recommendations:*
> - Success: ${sell.success}
> - Failure: ${sell.failure}
> - Neutral: ${sell.neutral}
> - Success Rate: ${
      sell.successRate === -1 ? "N/A" : sell.successRate.toFixed(2) + "%"
    }
    `;
    return formattedSummary;
  }
}
