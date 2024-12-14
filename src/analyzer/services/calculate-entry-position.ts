import { AnalysisEntryPosition, CalculatedIndicators } from "../types";

interface PositionCalculationParams {
  currentPrice: number;
  atr: number;
  rsi: number;
  vwap: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
}

function parseTechnicalData(technicalData: CalculatedIndicators) {
  return {
    currentPrice: technicalData.close[technicalData.close.length - 1],
    atr: technicalData.atr[technicalData.atr.length - 1],
    rsi: technicalData.rsi[technicalData.rsi.length - 1],
    vwap: technicalData.vwap[technicalData.vwap.length - 1],
    bollingerBands: {
      lower:
        technicalData.bollingerBands[technicalData.bollingerBands.length - 1]
          .lower,
      upper:
        technicalData.bollingerBands[technicalData.bollingerBands.length - 1]
          .upper,
      middle:
        technicalData.bollingerBands[technicalData.bollingerBands.length - 1]
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

  // 1. Entry Price Calculation
  // For 15min, we can be more aggressive with entries above VWAP
  const entryPrice =
    currentPrice > vwap
      ? vwap + (currentPrice - vwap) * 0.75 // If above VWAP, enter 75% of the way
      : currentPrice; // If below VWAP, enter at market

  // 2. Stop Loss Calculation
  // 15min allows for wider stops due to lower noise
  let atrMultiplier;
  switch (volatilityState) {
    case "LOW":
      atrMultiplier = 2.0;
      break; // Increased from 1.5
    case "MODERATE":
      atrMultiplier = 1.75;
      break; // Increased from 1.2
    case "HIGH":
      atrMultiplier = 1.5;
      break; // Increased from 1.0
    case "EXTREME":
      atrMultiplier = 1.2;
      break; // Increased from 0.8
  }

  const atrStop = entryPrice - atr * atrMultiplier;
  const vwapStop = vwap * 0.995; // 0.5% below VWAP (increased from 0.2%)
  const bbStop = bollingerBands.lower;

  // Use the highest (most conservative) stop loss
  const stopLoss = Math.max(atrStop, vwapStop, bbStop);

  // 3. Exit Price Calculation
  // Adjusted RSI levels for 15min timeframe
  let targetMultiplier;
  if (rsi < 35) targetMultiplier = 3.5; // More room for movement
  else if (rsi < 45) targetMultiplier = 3.0; // Increased targets
  else if (rsi > 65)
    targetMultiplier = 2.0; // Still decent target on overbought
  else targetMultiplier = 2.5; // Normal conditions

  const risk = entryPrice - stopLoss;
  const reward = risk * targetMultiplier;
  const exitPrice = entryPrice + reward;

  // 4. Calculate percentages and ratios
  const riskPercent = (risk / entryPrice) * 100;
  const rewardPercent = (reward / entryPrice) * 100;
  const rrRatio = rewardPercent / riskPercent;

  // Validate the setup - wider thresholds for 15min
  if (riskPercent > 1.5) {
    // Increased from 1.0%
    throw new Error("Risk percentage exceeds maximum threshold");
  }

  if (rrRatio < 2.0) {
    // Increased from 1.5
    throw new Error("Risk:Reward ratio below minimum threshold");
  }

  const rationale = `
Entry Strategy (15min):
- Entry Price: ${entryPrice.toFixed(2)} (${
    entryPrice > vwap ? "VWAP pullback entry" : "Market entry"
  })
- VWAP Reference: ${vwap.toFixed(2)}
- Volatility State: ${volatilityState}

Stop Loss Analysis:
- Stop Price: ${stopLoss.toFixed(2)} (${riskPercent.toFixed(2)}% risk)
- ATR Stop: ${atrStop.toFixed(2)} (${atrMultiplier}x ATR)
- VWAP Stop: ${vwapStop.toFixed(2)}
- BB Stop: ${bbStop.toFixed(2)}

Target Analysis:
- Exit Price: ${exitPrice.toFixed(2)} (${rewardPercent.toFixed(2)}% reward)
- R:R Ratio: ${rrRatio.toFixed(2)}:1
- Target Multiplier: ${targetMultiplier}x (RSI: ${rsi.toFixed(1)})

Market Context:
- ATR: ${atr.toFixed(2)} (${atrPercent.toFixed(2)}% of price)
- BB Range: ${bollingerBands.lower.toFixed(2)} - ${bollingerBands.upper.toFixed(
    2
  )}
`.trim();

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
