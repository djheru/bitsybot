import {
  AccountBalances,
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
    roc: validatedData.roc[validatedData.roc.length - 1],
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
  technicalData: CalculatedIndicators,
  accountBalances: AccountBalances
): AnalysisEntryPosition {
  const params = parseTechnicalData(technicalData);
  const { atr, bollingerBands, currentPrice, roc, rsi, vwap } = params;

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

  console.log("stopLevels: %j", { atrStop, vwapStop, bbStop });

  // // Use the most conservative (highest) stop loss
  // const stopLoss = Math.max(atrStop, vwapStop, bbStop);

  // Use the average of the two lowest values as the stop loss
  const stopLoss =
    [atrStop, vwapStop, bbStop]
      .sort((a, b) => a - b)
      .slice(0, 2)
      .reduce((a, b) => a + b) / 2;

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

  // **Position Sizing**
  const tetherBalance =
    accountBalances["USDT"]!.balance - accountBalances["USDT"]!.holdTrade;
  const riskAmount = tetherBalance * (riskPercent / 100); // Amount willing to lose
  const positionSize = riskAmount / (currentPrice - stopLoss); // Size in BTC

  // **Stop-Loss Percentage Decrease**
  const stopLossPercentage = ((currentPrice - stopLoss) / currentPrice) * 100;

  // Validation checks
  if (riskPercent > 1.5) {
    throw new Error(
      `Risk percentage (${riskPercent.toFixed(
        2
      )}%) exceeds maximum threshold of 1.5%`
    );
  }

  if (rrRatio < 2.0) {
    throw new Error(
      `Risk:Reward ratio (${rrRatio.toFixed(2)}) below minimum threshold of 2.0`
    );
  }

  const rationale = [
    `
:dart: * Target Analysis:*`,
    `>* *Exit Price:* ${exitPrice.toFixed(2)} (${rewardPercent.toFixed(
      2
    )}% reward)`,
    `>* *Position Size:* ${positionSize.toFixed(2)}`,
    `>* *Tether Balance:* ${tetherBalance.toFixed(2)}`,
    `>* *Risk Amount:* ${riskAmount.toFixed(2)}`,
    `>* *R:R Ratio:* ${rrRatio.toFixed(2)}:1`,
    `>* *Multiplier:* ${targetMultiplier}x (RSI: ${rsi.toFixed(1)})
    `,
    `:octagonal_sign: * Stop Loss Analysis*`,
    `>* *Trailing Stop Percentage*: ${stopLossPercentage.toFixed(2)}%`,
    `>* *Stop Price*: ${stopLoss.toFixed(2)} (${riskPercent.toFixed(2)}% risk)`,
    `>    _Calculated as Average (mean) of the 2 lowest values of the following:_`,
    `>    * *ATR-based:* ${atrStop.toFixed(2)} (${atrMultiplier}x ATR)`,
    `>    * *VWAP-based:* ${vwapStop.toFixed(2)}`,
    `>    * *BB-based:* ${bbStop.toFixed(2)}
    `,
    ":abacus: * Technical Context:*",
    `>* *ATR:* ${atr.toFixed(2)} (${atrPercent.toFixed(2)}% of price)`,
    `>* *BB Range:* ${bollingerBands.lower.toFixed(
      2
    )} - ${bollingerBands.upper.toFixed(2)}`,
    `>* *ROC:* ${roc.toFixed(2)}% - ${
      roc > 0
        ? "Momentum indicates bullish conditions."
        : "Momentum indicates bearish conditions."
    }`,
    `>* *RSI:* ${rsi.toFixed(1)} - ${
      rsi > 70
        ? "Market is potentially overbought."
        : rsi < 30
        ? "Market is potentially oversold."
        : "Market momentum is neutral."
    }`,
    `>* *Volatility:* ${volatilityState} (ATR: ${atrPercent.toFixed(2)}%)`,
    `>* *VWAP:* ${vwap.toFixed(2)} (${(
      ((entryPrice - vwap) / vwap) *
      100
    ).toFixed(2)}% from VWAP)`,
  ].join("\n");

  return {
    entryPrice,
    exitPrice,
    positionSize,
    rationale,
    rewardPercent,
    riskPercent,
    rrRatio,
    stopLoss,
    stopLossPercentage,
  };
}
