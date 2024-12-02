import { BaseAgent } from ".";
import { CalculatedIndicators } from "../types";
import { Prompts, PromptTemplate } from "./prompts";

export class VolatilityIndicatorAgent extends BaseAgent {
  public prompts: PromptTemplate = Prompts.Volatility;

  getAnalysisInput({
    bollingerBands,
    atr,
    roc,
    cci,
    psar,
  }: CalculatedIndicators) {
    return {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      BOLLINGER_LOWER: bollingerBands
        .slice(-1 * this.inputArrayLength)
        .map((b) => b.lower)
        .join(","),
      BOLLINGER_MIDDLE: bollingerBands
        .slice(-1 * this.inputArrayLength)
        .map((b) => b.middle)
        .join(","),
      BOLLINGER_UPPER: bollingerBands
        .slice(-1 * this.inputArrayLength)
        .map((b) => b.upper)
        .join(","),
      ATR: atr.slice(-1 * this.inputArrayLength).join(","),
      ROC: roc.slice(-1 * this.inputArrayLength).join(","),
      CCI: cci.slice(-1 * this.inputArrayLength).join(","),
      PSAR: psar.slice(-1 * this.inputArrayLength).join(","),
    };
  }
}
