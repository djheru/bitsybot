import { BaseAgent } from ".";
import { CalculatedIndicators } from "../types";
import { Prompts, PromptTemplate } from "./prompts";

export class MomentumIndicatorAgent extends BaseAgent {
  public prompts: PromptTemplate = Prompts.Momentum;

  getAnalysisInput({ rsi, stochastic, williamsR }: CalculatedIndicators) {
    return {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      RSI: rsi.slice(-1 * this.inputArrayLength).join(","),
      STOCHASTIC_K: stochastic
        .slice(-1 * this.inputArrayLength)
        .map((s) => s.k)
        .join(","),
      STOCHASTIC_D: stochastic
        .slice(-1 * this.inputArrayLength)
        .map((s) => s.d)
        .join(","),
      WILLIAMS_R: williamsR.slice(-1 * this.inputArrayLength).join(","),
    };
  }
}
