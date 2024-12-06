import { BaseAgent } from ".";
import { CalculatedIndicators } from "../types";
import { Prompts, PromptTemplate } from "./prompts";

export class IchimokuIndicatorAgent extends BaseAgent {
  public prompts: PromptTemplate = Prompts.IchimokuCloud;

  getAnalysisInput({ close, ichimokuCloud }: CalculatedIndicators) {
    return {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      CURRENT: close[close.length - 1],
      TENKAN_SEN: ichimokuCloud
        .slice(-1 * this.inputArrayLength)
        .map((i) => i.conversion)
        .join(","),
      KIJUN_SEN: ichimokuCloud
        .slice(-1 * this.inputArrayLength)
        .map((i) => i.base)
        .join(","),
      SENKOU_SPAN_A: ichimokuCloud
        .slice(-1 * this.inputArrayLength)
        .map((i) => i.spanA)
        .join(","),
      SENKOU_SPAN_B: ichimokuCloud
        .slice(-1 * this.inputArrayLength)
        .map((i) => i.spanB)
        .join(","),
      PRICE_ABOVE_CLOUD:
        this.calculatePriceRelativeToCloud(
          close[close.length - 1],
          ichimokuCloud[ichimokuCloud.length - 1].spanA,
          ichimokuCloud[ichimokuCloud.length - 1].spanB
        ) === "above"
          ? "YES"
          : "NO",
      PRICE_INSIDE_CLOUD:
        this.calculatePriceRelativeToCloud(
          close[close.length - 1],
          ichimokuCloud[ichimokuCloud.length - 1].spanA,
          ichimokuCloud[ichimokuCloud.length - 1].spanB
        ) === "inside"
          ? "YES"
          : "NO",
      PRICE_BELOW_CLOUD:
        this.calculatePriceRelativeToCloud(
          close[close.length - 1],
          ichimokuCloud[ichimokuCloud.length - 1].spanA,
          ichimokuCloud[ichimokuCloud.length - 1].spanB
        ) === "below"
          ? "YES"
          : "NO",
    };
  }

  calculatePriceRelativeToCloud(
    currentPrice: number,
    spanA: number,
    spanB: number
  ): "above" | "inside" | "below" {
    // Find the boundaries of the cloud
    const cloudTop = Math.max(spanA, spanB);
    const cloudBottom = Math.min(spanA, spanB);

    // Determine the price's position relative to the cloud
    if (currentPrice > cloudTop) {
      return "above";
    } else if (currentPrice < cloudBottom) {
      return "below";
    } else {
      return "inside";
    }
  }
}
