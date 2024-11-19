// src/analysis/signal-evaluator.ts

import { Logger } from "@aws-lambda-powertools/logger";
import { AnalysisRecord } from "../types";
import { AnalysisRepository } from "./db";
import { KrakenService } from "./kraken";

interface SignalResult {
  signalId: string;
  success: boolean;
  entryPrice: number;
  exitPrice: number;
  pnlPoints: number;
  pnlPercent: number;
  timeToResult: number; // minutes
  hitTarget: boolean;
  hitStop: boolean;
  confidence: number;
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
      if (!actionPlan) {
        this.logger.warn("Could not parse action plan", {
          signalId: signal.uuid,
          rationale: signal.finalAnalysis.rationale,
        });
        return null;
      }

      // Get next hour of price data (12 x 5min candles)
      const futureData = await this.krakenService.fetchPriceData({
        interval: 5,
        since: new Date(signal.timestamp).getTime() / 1000,
        totalPeriods: 12,
      });

      if (!futureData || futureData.length === 0) {
        this.logger.warn("No future price data available", {
          signalId: signal.uuid,
          timestamp: signal.timestamp,
        });
        return null;
      }

      this.logger.debug("Evaluating signal", {
        signalId: signal.uuid,
        recommendation: signal.finalRecommendation,
        confidence: signal.confidence,
        entry: signal.currentPrice,
        stop: actionPlan.stop,
        target: actionPlan.target,
        candlesReceived: futureData.length,
      });

      // Create base result object for DRY code
      const createResult = (
        success: boolean,
        exitPrice: number,
        timeToResult: number,
        hitTarget: boolean,
        hitStop: boolean
      ): SignalResult => ({
        signalId: signal.uuid,
        success,
        entryPrice: signal.currentPrice,
        exitPrice,
        pnlPoints:
          signal.finalRecommendation === "BUY"
            ? exitPrice - signal.currentPrice
            : signal.currentPrice - exitPrice,
        pnlPercent:
          ((exitPrice - signal.currentPrice) / signal.currentPrice) * 100,
        timeToResult,
        hitTarget,
        hitStop,
        confidence: signal.confidence,
      });

      // Evaluate each candle
      for (let i = 0; i < futureData.length; i++) {
        const candle = futureData[i];
        const timeToResult = i * 5; // minutes

        if (signal.finalRecommendation === "BUY") {
          // Check target hit
          if (candle.high >= actionPlan.target) {
            return createResult(
              true,
              actionPlan.target,
              timeToResult,
              true,
              false
            );
          }
          // Check stop hit
          if (candle.low <= actionPlan.stop) {
            return createResult(
              false,
              actionPlan.stop,
              timeToResult,
              false,
              true
            );
          }
        } else if (signal.finalRecommendation === "SELL") {
          // Check target hit
          if (candle.low <= actionPlan.target) {
            return createResult(
              true,
              actionPlan.target,
              timeToResult,
              true,
              false
            );
          }
          // Check stop hit
          if (candle.high >= actionPlan.stop) {
            return createResult(
              false,
              actionPlan.stop,
              timeToResult,
              false,
              true
            );
          }
        }
      }

      // If neither target nor stop was hit
      this.logger.debug("Signal evaluation incomplete", {
        signalId: signal.uuid,
        recommendation: signal.finalRecommendation,
        reason: "No target or stop hit within timeframe",
      });

      return null;
    } catch (error) {
      this.logger.error("Failed to evaluate signal", {
        error,
        signalId: signal.uuid,
        timestamp: signal.timestamp,
        recommendation: signal.finalRecommendation,
        confidence: signal.confidence,
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
    // Filter out null results and separate wins/losses
    const validResults = results.filter((r) => r !== null) as SignalResult[];
    const successfulTrades = validResults.filter((r) => r.success);
    const failedTrades = validResults.filter((r) => !r.success);

    // High confidence analysis
    const highConfidenceSignals = signals.filter((s) => s.confidence >= 4);
    const highConfidenceResults = validResults.filter((r) => {
      const signal = signals.find((s) => s.uuid === r.signalId);
      return signal ? signal.confidence >= 4 : false;
    });
    const highConfidenceSuccesses = highConfidenceResults.filter(
      (r) => r.success
    );

    // Calculate PnL metrics
    const winSizes = successfulTrades.map((r) => Math.abs(r.pnlPercent));
    const lossSizes = failedTrades.map((r) => Math.abs(r.pnlPercent));

    // Calculate profit factor (handle division by zero)
    const totalWins = winSizes.reduce((sum, size) => sum + size, 0);
    const totalLosses = lossSizes.reduce((sum, size) => sum + size, 0);
    const profitFactor =
      totalLosses === 0 ? totalWins : totalWins / totalLosses;

    // Time analysis
    const winTimes = successfulTrades.map((r) => r.timeToResult);
    const lossTimes = failedTrades.map((r) => r.timeToResult);

    // Confidence breakdown
    const confidenceBreakdown = {
      confidence5: signals.filter((s) => s.confidence === 5).length,
      confidence4: signals.filter((s) => s.confidence === 4).length,
      confidence3: signals.filter((s) => s.confidence === 3).length,
      confidence2: signals.filter((s) => s.confidence === 2).length,
      confidence1: signals.filter((s) => s.confidence === 1).length,
    };

    return {
      totalSignals: signals.length,
      buySignals: signals.filter((s) => s.finalRecommendation === "BUY").length,
      sellSignals: signals.filter((s) => s.finalRecommendation === "SELL")
        .length,
      successfulTrades: successfulTrades.length,
      failedTrades: failedTrades.length,
      pendingTrades: signals.length - validResults.length,

      winRate:
        validResults.length > 0
          ? successfulTrades.length / validResults.length
          : 0,

      averagePnlPercent: this.average(validResults.map((r) => r.pnlPercent)),
      averageTimeToResult: this.average(
        validResults.map((r) => r.timeToResult)
      ),

      bestTrade:
        validResults.length > 0
          ? Math.max(...validResults.map((r) => r.pnlPercent))
          : 0,

      worstTrade:
        validResults.length > 0
          ? Math.min(...validResults.map((r) => r.pnlPercent))
          : 0,

      highConfidenceWinRate:
        highConfidenceResults.length > 0
          ? highConfidenceSuccesses.length / highConfidenceResults.length
          : 0,

      highConfidenceSignals: highConfidenceSignals.length,

      avgWinSize: successfulTrades.length > 0 ? this.average(winSizes) : 0,

      avgLossSize: failedTrades.length > 0 ? this.average(lossSizes) : 0,

      profitFactor,

      timeAnalysis: {
        avgTimeToWin: successfulTrades.length > 0 ? this.average(winTimes) : 0,
        avgTimeToLoss: failedTrades.length > 0 ? this.average(lossTimes) : 0,
      },

      confidenceBreakdown,
    };
  }
}
