import {
  AnalysisEntryPosition,
  CalculatedIndicators,
  OrderBookData,
} from "../types";

interface CalculateEntryPositionParams extends CalculatedIndicators {
  close: number[];
  atr: number[];
  bollingerBands: { lower: number; middle: number; upper: number }[];
  atrBuffer?: number; // Multiplier for ATR, default is 1.75
  bollingerBuffer?: number; // % buffer for Bollinger bands, default is 3%
  roc: number[]; // Rate of Change, optional
  rsi: number[]; // Relative Strength Index, optional
  orderBookData: OrderBookData;
  riskRewardRatio?: number; // R:R ratio, default is 3:1
}

export function calculateEntryPosition({
  close,
  atr,
  bollingerBands,
  atrBuffer = 1.75,
  bollingerBuffer = 3,
  roc,
  rsi,
  orderBookData,
  riskRewardRatio = 3,
}: CalculateEntryPositionParams): AnalysisEntryPosition {
  const currentPrice = close[close.length - 1];
  const bollingerUpper = bollingerBands.map((b) => b.upper);
  const bollingerLower = bollingerBands.map((b) => b.lower);
  const orderBookAsks = orderBookData.asks;

  // Stop Loss Calculation
  const recentATR = atr[atr.length - 1];
  const atrStopLoss = currentPrice - recentATR * atrBuffer;
  const bollingerStopLoss =
    bollingerLower[bollingerLower.length - 1] * (1 - bollingerBuffer / 100);
  const stopLoss = Math.min(atrStopLoss, bollingerStopLoss);

  // Dynamic R:R Adjustment
  const recentROC = roc ? roc[roc.length - 1] : 0;
  const recentRSI = rsi ? rsi[rsi.length - 1] : 50;

  // Adjust R:R based on momentum
  let adjustedRiskRewardRatio = riskRewardRatio;
  if (recentROC < 0 || recentRSI < 50) {
    adjustedRiskRewardRatio -= 0.5; // Reduce R:R when momentum is weaker
  }
  if (recentRSI > 70 || recentROC > 0.5) {
    adjustedRiskRewardRatio += 0.5; // Increase R:R when momentum is stronger
  }
  adjustedRiskRewardRatio = Math.max(1.5, adjustedRiskRewardRatio); // Ensure a minimum R:R ratio

  // Exit Price Calculation
  const risk = currentPrice - stopLoss;
  let exitPrice = currentPrice + risk * adjustedRiskRewardRatio;

  // Cap Exit Price at Resistance Levels
  const bollingerCap = bollingerUpper[bollingerUpper.length - 1];
  const orderBookCap = orderBookAsks[0]?.price || Number.MAX_VALUE;
  exitPrice = Math.min(exitPrice, bollingerCap, orderBookCap);

  // Entry Price Calculation
  const entryPrice = orderBookAsks[0]?.price || currentPrice;

  // Rationale
  let rationale = `
Entry Price is set at ${entryPrice.toFixed(
    4
  )}, derived from the closest ask in the order book (${orderBookAsks[0]?.price.toFixed(
    4
  )}).
Stop Loss is calculated as the lower of:
  - ATR-based stop (${atrStopLoss.toFixed(4)}),
  - Bollinger Band lower limit with buffer (${bollingerStopLoss.toFixed(4)}).
Final Stop Loss: ${stopLoss.toFixed(4)}.
Exit Price is calculated using:
  - Risk-to-Reward ratio: ${adjustedRiskRewardRatio}:1,
  - Capped at Bollinger Band upper limit (${bollingerCap.toFixed(4)}),
  - Capped at nearest significant order book resistance (${orderBookCap.toFixed(
    4
  )}).
Final Exit Price: ${exitPrice.toFixed(4)}.
  `;

  // Optional: Add ROC and RSI insights
  if (roc) {
    rationale += `
      Recent Rate of Change (ROC): ${recentROC.toFixed(2)}%.
      ${
        recentROC > 0
          ? "Momentum indicates bullish conditions."
          : "Momentum indicates bearish conditions."
      }
    `;
  }
  if (rsi) {
    rationale += `
      Recent Relative Strength Index (RSI): ${recentRSI.toFixed(2)}.
      ${
        recentRSI > 70
          ? "Market is potentially overbought."
          : recentRSI < 30
          ? "Market is potentially oversold."
          : "Market momentum is neutral."
      }
    `;
  }

  return {
    entryPrice,
    exitPrice,
    stopLoss,
    rationale: rationale.trim(),
  };
}
