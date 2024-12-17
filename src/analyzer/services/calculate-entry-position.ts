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

function calculatePositionSize2({
  tetherBalance,
  currentPrice,
  stopLoss,
  riskPercent,
}: {
  tetherBalance: number;
  currentPrice: number;
  stopLoss: number;
  riskPercent: number;
}) {
  console.log("calculatePositionSize: %j", {
    tetherBalance,
    currentPrice,
    stopLoss,
    riskPercent,
  });
  if (tetherBalance <= 0) {
    throw new Error("Insufficient USDT balance for trading.");
  }

  if (stopLoss >= currentPrice) {
    throw new Error("Invalid stop-loss: must be below the current price.");
  }

  const riskAmount = tetherBalance * (riskPercent / 100);
  console.log("riskAmount: %j", riskAmount);
  const riskPerUnit = currentPrice - stopLoss;
  console.log("riskPerUnit: %j", riskPerUnit);

  let positionSize = riskAmount / riskPerUnit;
  console.log("positionSize: %j", positionSize);

  // Cap Position Size to 10% Available Funds
  const maxPositionSize = (tetherBalance * 0.1) / currentPrice;
  positionSize = Math.min(positionSize, maxPositionSize);

  // Validate Minimum Trade Size
  const minimumTradeSize = 0.00005; // Example for BTC
  if (positionSize < minimumTradeSize) {
    throw new Error(
      `Position size (${positionSize.toFixed(
        5
      )}) is below the minimum trade size of ${minimumTradeSize}.`
    );
  }

  return { positionSize, riskAmount, tetherBalance };
}

interface PositionSizingParams {
  tetherBalance: number; // Available USDT balance
  currentPrice: number; // Entry price
  stopLoss: number; // Stop loss price
  maxRiskPercent: number; // Maximum risk per trade (e.g., 1%)
  maxPositionPercent: number; // Maximum position size as % of balance (e.g., 10%)
  volatilityState: "LOW" | "MODERATE" | "HIGH" | "EXTREME";
}

interface PositionSizingResult {
  positionSize: number; // Size in BTC
  positionValue: number; // Size in USDT
  riskAmount: number; // Amount at risk in USDT
  riskPercent: number; // Actual risk percentage
  effectiveLeverage: number; // Position value / risk amount
}

function calculatePositionSize({
  tetherBalance,
  currentPrice,
  stopLoss,
  maxRiskPercent = 1,
  maxPositionPercent = 10,
  volatilityState,
}: PositionSizingParams): PositionSizingResult {
  // Validation
  if (tetherBalance <= 0) {
    throw new Error("Insufficient USDT balance");
  }
  if (stopLoss >= currentPrice) {
    throw new Error("Stop loss must be below entry price for long positions");
  }

  // Calculate risk per unit
  const riskPerUnit = currentPrice - stopLoss;
  if (riskPerUnit <= 0) {
    throw new Error("Invalid risk per unit");
  }

  // Adjust max risk based on volatility
  const volatilityAdjustment = {
    LOW: 1.0,
    MODERATE: 0.8,
    HIGH: 0.6,
    EXTREME: 0.4,
  };
  const adjustedMaxRisk =
    maxRiskPercent * volatilityAdjustment[volatilityState];

  // Calculate maximum risk amount in USDT
  const maxRiskAmount = tetherBalance * (adjustedMaxRisk / 100);

  // Calculate position size based on risk
  let positionSize = maxRiskAmount / riskPerUnit;

  // Calculate position value in USDT
  let positionValue = positionSize * currentPrice;

  // Cap position size based on maxPositionPercent
  const maxPositionValue = tetherBalance * (maxPositionPercent / 100);
  if (positionValue > maxPositionValue) {
    positionSize = maxPositionValue / currentPrice;
    positionValue = maxPositionValue;
  }

  // Apply minimum trade size
  const minTradeSize = 0.00005; // BTC
  if (positionSize < minTradeSize) {
    throw new Error(
      `Position size (${positionSize.toFixed(
        5
      )} BTC) below minimum (${minTradeSize} BTC)`
    );
  }

  // Calculate actual risk
  const actualRiskAmount = positionSize * riskPerUnit;
  const actualRiskPercent = (actualRiskAmount / tetherBalance) * 100;
  const effectiveLeverage = positionValue / actualRiskAmount;

  return {
    positionSize: Number(positionSize.toFixed(5)),
    positionValue: Number(positionValue.toFixed(2)),
    riskAmount: Number(actualRiskAmount.toFixed(2)),
    riskPercent: Number(actualRiskPercent.toFixed(2)),
    effectiveLeverage: Number(effectiveLeverage.toFixed(2)),
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
      .reduce((a, b) => a + b, 0) / 2;

  // 3. Exit Price Calculation
  let targetMultiplier;
  if (rsi < 35) targetMultiplier = 2.6; // Reduced from 3.5
  else if (rsi < 45) targetMultiplier = 2.2; // Reduced from 3.0
  else if (rsi > 65) targetMultiplier = 1.8;
  else targetMultiplier = 2.25; // Reduced from 2.5

  const risk = entryPrice - stopLoss;
  const reward = risk * targetMultiplier;
  const exitPrice = entryPrice + reward;

  // 4. Risk Calculations
  const riskPercent = Math.min((risk / entryPrice) * 100, 1.5);
  const rewardPercent = (reward / entryPrice) * 100;
  const rrRatio = rewardPercent / riskPercent;

  // **Position Sizing**
  const availableBalance =
    accountBalances["USDT"]!.balance - accountBalances["USDT"]!.holdTrade;

  const {
    positionSize,
    riskAmount,
    positionValue,
    riskPercent: actualRiskPercent,
  } = calculatePositionSize({
    tetherBalance: availableBalance,
    currentPrice: entryPrice,
    stopLoss,
    maxRiskPercent: 1,
    maxPositionPercent: 10,
    volatilityState,
  });

  // **Stop-Loss Percentage Decrease**
  const stopLossPercentage = ((currentPrice - stopLoss) / currentPrice) * 100;

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
    `>* *Position Size:* ${positionSize.toFixed(
      5
    )} BTC (${positionValue.toFixed(2)} USDT)`,
    `>* *Tether Balance:* ${availableBalance.toFixed(2)}`,
    `>* *Risk Amount:* ${riskAmount.toFixed(
      2
    )} USDT (${actualRiskPercent.toFixed(2)}%)`,
    `>* *R:R Ratio:* ${rrRatio.toFixed(2)}:1`,
    `>* *Multiplier:* ${targetMultiplier}x (RSI: ${rsi.toFixed(1)})
    `,
    `:octagonal_sign: * Stop Loss Analysis*`,
    `>* *Trailing Stop Percentage*: ${stopLossPercentage.toFixed(2)}%`,
    `>* *Stop Price*: ${stopLoss.toFixed(2)} (${actualRiskPercent.toFixed(
      2
    )}% risk)`,
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
    `>* *Volatility:* _${volatilityState}_ (ATR: ${atrPercent.toFixed(2)}%)`,
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
