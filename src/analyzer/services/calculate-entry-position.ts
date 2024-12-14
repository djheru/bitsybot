import {
  AnalysisEntryPosition,
  CalculatedIndicators,
  CalculatedIndicatorsSchema,
} from "../types";

function parseTechnicalData(data: CalculatedIndicators) {
  const validatedData = CalculatedIndicatorsSchema.parse(data);
  return {
    currentPrice: validatedData.close[validatedData.close.length - 1],
    atr: validatedData.atr[validatedData.atr.length - 1],
    rsi: validatedData.rsi[validatedData.rsi.length - 1],
    vwap: validatedData.vwap[validatedData.vwap.length - 1],
    bollingerBands: {
      lower:
        validatedData.bollingerBands[validatedData.bollingerBands.length - 1]
          .lower,
      upper:
        validatedData.bollingerBands[validatedData.bollingerBands.length - 1]
          .upper,
      middle:
        validatedData.bollingerBands[validatedData.bollingerBands.length - 1]
          .middle,
    },
  };
}

export function calculateEntryPosition(
  technicalData: CalculatedIndicators
): AnalysisEntryPosition {
  const params = parseTechnicalData(technicalData);
  const { currentPrice, atr, rsi, vwap, bollingerBands } = params;

  const atrPercent = (atr / currentPrice) * 100;
  const volatilityState =
    atrPercent < 0.15
      ? "LOW"
      : atrPercent < 0.3
      ? "MODERATE"
      : atrPercent < 0.5
      ? "HIGH"
      : "EXTREME";

  // 1. Entry Price - Always use current price
  const entryPrice = currentPrice;

  // 2. Stop Loss Calculation
  let atrMultiplier;
  switch (volatilityState) {
    case "LOW":
      atrMultiplier = 1.5; // Reduced from 2.0
      break;
    case "MODERATE":
      atrMultiplier = 1.25; // Reduced from 1.75
      break;
    case "HIGH":
      atrMultiplier = 1.0; // Reduced from 1.5
      break;
    case "EXTREME":
      atrMultiplier = 0.75; // Reduced from 1.2
      break;
  }

  // Calculate various stop levels
  const atrStop = entryPrice - atr * atrMultiplier;
  const vwapStop = vwap * 0.997; // 0.3% below VWAP (reduced from 0.5%)
  const bbStop = bollingerBands.lower;

  // // Use the most conservative (highest) stop loss
  // const stopLoss = Math.max(atrStop, vwapStop, bbStop);

  // Use the average of the three values as the stop loss
  const stopLoss = (atrStop + vwapStop + bbStop) / 3;

  // 3. Exit Price Calculation
  let targetMultiplier;
  if (rsi < 35) targetMultiplier = 3.0; // Reduced from 3.5
  else if (rsi < 45) targetMultiplier = 2.5; // Reduced from 3.0
  else if (rsi > 65) targetMultiplier = 2.0; // Kept same
  else targetMultiplier = 2.25; // Reduced from 2.5

  const risk = entryPrice - stopLoss;
  const reward = risk * targetMultiplier;
  const exitPrice = entryPrice + reward;

  // 4. Risk Calculations
  const riskPercent = (risk / entryPrice) * 100;
  const rewardPercent = (reward / entryPrice) * 100;
  const rrRatio = rewardPercent / riskPercent;

  // Validation checks
  if (riskPercent > 1.0) {
    // Reduced from 1.5%
    throw new Error(
      `Risk percentage (${riskPercent.toFixed(
        2
      )}%) exceeds maximum threshold of 1.0%`
    );
  }

  if (rrRatio < 2.0) {
    throw new Error(
      `Risk:Reward ratio (${rrRatio.toFixed(2)}) below minimum threshold of 2.0`
    );
  }

  const rationale = [
    "Entry Analysis:",
    `• Entry Price: ${entryPrice.toFixed(2)} (market entry)`,
    `• Current VWAP: ${vwap.toFixed(2)} (${(
      ((entryPrice - vwap) / vwap) *
      100
    ).toFixed(2)}% from VWAP)`,
    `• Volatility: ${volatilityState} (ATR: ${atrPercent.toFixed(2)}%)`,
    "",
    "Stop Loss Analysis:",
    `• Stop Price: ${stopLoss.toFixed(2)} (${riskPercent.toFixed(2)}% risk)`,
    `Average (mean) of the following:`,
    `• ATR-based: ${atrStop.toFixed(2)} (${atrMultiplier}x ATR)`,
    `• VWAP-based: ${vwapStop.toFixed(2)}`,
    `• BB-based: ${bbStop.toFixed(2)}`,
    "",
    "Target Analysis:",
    `• Exit Price: ${exitPrice.toFixed(2)} (${rewardPercent.toFixed(
      2
    )}% reward)`,
    `• R:R Ratio: ${rrRatio.toFixed(2)}:1`,
    `• Multiplier: ${targetMultiplier}x (RSI: ${rsi.toFixed(1)})`,
    "",
    "Technical Context:",
    `• BB Range: ${bollingerBands.lower.toFixed(
      2
    )} - ${bollingerBands.upper.toFixed(2)}`,
    `• ATR: ${atr.toFixed(2)} (${atrPercent.toFixed(2)}% of price)`,
    `• RSI: ${rsi.toFixed(1)}`,
  ].join("\n");

  return {
    entryPrice,
    stopLoss,
    exitPrice,
    riskPercent,
    rewardPercent,
    rrRatio,
    rationale,
  };
}
