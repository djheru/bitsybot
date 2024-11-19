// src/analysis/signal-evaluator.ts

import { Logger } from "@aws-lambda-powertools/logger";
import { AnalysisRecord } from "../types";
import { AnalysisRepository } from "./db";
import { KrakenService } from "./kraken";

interface SignalResult {
  success: boolean;
  entryPrice: number;
  exitPrice: number;
  pnlPoints: number;
  pnlPercent: number;
  timeToResult: number; // minutes
  hitTarget: boolean;
  hitStop: boolean;
}

interface EvaluationSummary {
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
  successfulTrades: number;
  failedTrades: number;
  pendingTrades: number;
  winRate: number;
  averagePnlPercent: number;
  averageTimeToResult: number;
  bestTrade: number;
  worstTrade: number;
  highConfidenceWinRate: number; // signals with confidence >= 4
  highConfidenceSignals: number; // total number of high confidence signals
  avgWinSize: number; // average size of winning trades
  avgLossSize: number; // average size of losing trades
  profitFactor: number; // total wins / total losses
  timeAnalysis: {
    avgTimeToWin: number;
    avgTimeToLoss: number;
  };
  confidenceBreakdown: {
    confidence5: number;
    confidence4: number;
    confidence3: number;
    confidence2: number;
    confidence1: number;
  };
}

export class SignalEvaluator {
  constructor(
    private readonly logger: Logger,
    private readonly krakenService: KrakenService,
    private readonly analysisRepository: AnalysisRepository
  ) {}

  async evaluateHistoricalSignals(
    startDate: string,
    endDate: string,
    symbol: string
  ): Promise<EvaluationSummary> {
    try {
      // Get historical signals
      const { records: signals } =
        await this.analysisRepository.listByTimestamp({
          symbol,
          start: startDate,
          end: endDate,
        });

      this.logger.info("Evaluating signals", {
        totalSignals: signals.length,
        startDate,
        endDate,
      });

      const results: Array<SignalResult | null> = [];

      // Evaluate each signal
      for (const signal of signals) {
        if (signal.finalRecommendation === "HOLD") continue;

        const result = await this.evaluateSignal(signal);
        if (result) results.push(result);
      }

      return this.generateSummary(signals, results);
    } catch (error) {
      this.logger.error("Failed to evaluate signals", { error });
      throw error;
    }
  }

  private async evaluateSignal(
    signal: AnalysisRecord
  ): Promise<SignalResult | null> {
    try {
      // Parse action plan from rationale
      const actionPlan = this.parseActionPlan(signal.finalAnalysis.rationale);
      if (!actionPlan) return null;

      // Get next hour of price data (12 x 5min candles)
      const futureData = await this.krakenService.fetchPriceData();

      // Evaluate the outcome
      let result: SignalResult | null = null;

      for (let i = 0; i < futureData.length; i++) {
        const candle = futureData[i];

        if (signal.finalRecommendation === "BUY") {
          // Check if target was hit
          if (candle.high >= actionPlan.target) {
            result = {
              success: true,
              entryPrice: signal.currentPrice,
              exitPrice: actionPlan.target,
              pnlPoints: actionPlan.target - signal.currentPrice,
              pnlPercent:
                ((actionPlan.target - signal.currentPrice) /
                  signal.currentPrice) *
                100,
              timeToResult: i * 5, // minutes
              hitTarget: true,
              hitStop: false,
            };
            break;
          }
          // Check if stop was hit
          if (candle.low <= actionPlan.stop) {
            result = {
              success: false,
              entryPrice: signal.currentPrice,
              exitPrice: actionPlan.stop,
              pnlPoints: actionPlan.stop - signal.currentPrice,
              pnlPercent:
                ((actionPlan.stop - signal.currentPrice) /
                  signal.currentPrice) *
                100,
              timeToResult: i * 5,
              hitTarget: false,
              hitStop: true,
            };
            break;
          }
        } else if (signal.finalRecommendation === "SELL") {
          // Check if target was hit
          if (candle.low <= actionPlan.target) {
            result = {
              success: true,
              entryPrice: signal.currentPrice,
              exitPrice: actionPlan.target,
              pnlPoints: signal.currentPrice - actionPlan.target,
              pnlPercent:
                ((signal.currentPrice - actionPlan.target) /
                  signal.currentPrice) *
                100,
              timeToResult: i * 5,
              hitTarget: true,
              hitStop: false,
            };
            break;
          }
          // Check if stop was hit
          if (candle.high >= actionPlan.stop) {
            result = {
              success: false,
              entryPrice: signal.currentPrice,
              exitPrice: actionPlan.stop,
              pnlPoints: signal.currentPrice - actionPlan.stop,
              pnlPercent:
                ((signal.currentPrice - actionPlan.stop) /
                  signal.currentPrice) *
                100,
              timeToResult: i * 5,
              hitTarget: false,
              hitStop: true,
            };
            break;
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error("Failed to evaluate signal", {
        error,
        signalId: signal.uuid,
        timestamp: signal.timestamp,
      });
      return null;
    }
  }

  private parseActionPlan(
    rationale: string
  ): { entry: number; stop: number; target: number } | null {
    try {
      // Find the Action Plan section using regex
      const actionPlanMatch = rationale.match(
        /Action Plan:[\s\S]*?(?=\n\nKey Risks:)/
      );
      if (!actionPlanMatch) return null;

      const actionPlanText = actionPlanMatch[0];

      // Extract values
      const entry = parseFloat(
        actionPlanText.match(/Entry: (\d+\.?\d*)/)?.[1] || ""
      );
      const stop = parseFloat(
        actionPlanText.match(/Stop: (\d+\.?\d*)/)?.[1] || ""
      );
      const target = parseFloat(
        actionPlanText.match(/Target: (\d+\.?\d*)/)?.[1] || ""
      );

      if (isNaN(entry) || isNaN(stop) || isNaN(target)) {
        return null;
      }

      return { entry, stop, target };
    } catch (error) {
      this.logger.error("Failed to parse action plan", { error, rationale });
      return null;
    }
  }

  private average(numbers: number[]): number {
    if (!numbers.length) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private generateSummary(
    signals: AnalysisRecord[],
    results: Array<SignalResult | null>
  ): EvaluationSummary {
    const validResults = results.filter((r) => r !== null) as SignalResult[];
    const successfulTrades = validResults.filter((r) => r.success);
    const highConfidenceSignals = signals.filter((s) => s.confidence >= 4);
    const highConfidenceSuccesses = highConfidenceSignals.filter((s) =>
      validResults.find((r) => r.success)
    );

    return {
      totalSignals: signals.length,
      buySignals: signals.filter((s) => s.finalRecommendation === "BUY").length,
      sellSignals: signals.filter((s) => s.finalRecommendation === "SELL")
        .length,
      successfulTrades: successfulTrades.length,
      failedTrades: validResults.length - successfulTrades.length,
      pendingTrades: signals.length - validResults.length,
      winRate: successfulTrades.length / validResults.length,
      averagePnlPercent: this.average(validResults.map((r) => r.pnlPercent)),
      averageTimeToResult: this.average(
        validResults.map((r) => r.timeToResult)
      ),
      bestTrade: Math.max(...validResults.map((r) => r.pnlPercent)),
      worstTrade: Math.min(...validResults.map((r) => r.pnlPercent)),
      highConfidenceWinRate:
        highConfidenceSuccesses.length / highConfidenceSignals.length,
    };
  }
}
