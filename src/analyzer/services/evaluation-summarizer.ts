import { Logger } from "@aws-lambda-powertools/logger";
import { EvaluationResult } from "../types";

export class EvaluationSummarizer {
  constructor(private readonly logger: Logger) {}

  async summarizeEvaluations(evaluations: EvaluationResult[]) {
    try {
      const summary = this.analyzeEvaluations(evaluations);
      return { ...summary, formattedSummary: this.formatSummary(summary) };
    } catch (error) {
      this.logger.error("Failed to summarize evaluations", { error });
      throw error;
    }
  }

  private analyzeEvaluations(evaluations: EvaluationResult[]) {
    const results = {
      buy: { success: 0, failure: 0, neutral: 0 },
      sell: { success: 0, failure: 0, neutral: 0 },
      total: evaluations.length,
    };

    for (const record of evaluations) {
      const { recommendation, outcome } = record;
      if (recommendation === "BUY") {
        results.buy[outcome as keyof typeof results.buy]++;
      } else if (recommendation === "SELL") {
        results.sell[outcome as keyof typeof results.sell]++;
      }
    }

    return results;
  }

  private formatSummary(
    summary: ReturnType<EvaluationSummarizer["analyzeEvaluations"]>
  ) {
    const { buy, sell, total } = summary;

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
