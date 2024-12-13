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
  const bollingerLower = bollingerBands.map((b) => b.lower);
  const orderBookAsks = orderBookData.asks;

  // Stop Loss Calculation
  const recentATR = atr[atr.length - 1];
  const atrStopLoss = currentPrice - recentATR * atrBuffer;
  const bollingerStopLoss =
    bollingerLower[bollingerLower.length - 1] * (1 - bollingerBuffer / 100);
  const stopLoss = Math.min(atrStopLoss, bollingerStopLoss);

  // Exit Price Calculation
  const risk = currentPrice - stopLoss;
  const exitPrice = currentPrice + risk * riskRewardRatio;

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
Exit Price is determined using a Risk-to-Reward ratio of ${riskRewardRatio}:1, yielding ${exitPrice.toFixed(
    4
  )}.
  `;

  // Optional: Add ROC and RSI insights
  if (roc) {
    const recentROC = roc[roc.length - 1];
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
    const recentRSI = rsi[rsi.length - 1];
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
