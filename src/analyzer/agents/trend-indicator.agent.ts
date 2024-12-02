import { BaseAgent } from ".";
import { CalculatedIndicators } from "../types";
import { Prompts, PromptTemplate } from "./prompts";

export class TrendIndicatorAgent extends BaseAgent {
  public prompts: PromptTemplate = Prompts.Trend;

  protected getAnalysisInput({ ema, macd, adx }: CalculatedIndicators) {
    return {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      EMA: ema.slice(-1 * this.inputArrayLength).join(","),
      MACD: macd
        .slice(-1 * this.inputArrayLength)
        .map((m) => m.MACD || "-")
        .join(","),
      SIGNAL: macd
        .slice(-1 * this.inputArrayLength)
        .map((m) => m.signal || "-")
        .join(","),
      HIST: macd
        .slice(-1 * this.inputArrayLength)
        .map((m) => m.histogram || "-")
        .join(","),
      ADX: adx
        .slice(-1 * this.inputArrayLength)
        .map((a) => a.adx)
        .join(","),
      PDI: adx
        .slice(-1 * this.inputArrayLength)
        .map((a) => a.pdi)
        .join(","),
      MDI: adx
        .slice(-1 * this.inputArrayLength)
        .map((a) => a.mdi)
        .join(","),
    };
  }
}
